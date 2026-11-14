import PlanetFallback from "@/components/terratwin/PlanetFallback";
import { candidates } from "@/data/catalog";
import type { CameraAction } from "@/domain/terratwin";
import { clampEarthCameraDistance } from "@/features/explorer/renderingPolicy";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useEffect, useRef, useState } from "react";

type EarthCesiumViewerProps = {
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  cameraAction: CameraAction;
  showCandidates: boolean;
  visualLayerEnabled: boolean;
  visibleCandidateIds?: string[];
};

function requestViewerRender(viewer: import("cesium").Viewer | null) {
  if (!viewer || viewer.isDestroyed()) return;
  viewer.scene.requestRender();
}

function getAdaptiveResolutionScale() {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return 0.8;

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  let scale = 0.82;
  if (hardwareConcurrency <= 4) scale -= 0.08;
  if (typeof deviceMemory === "number" && deviceMemory <= 4) scale -= 0.06;
  if (coarsePointer) scale -= 0.04;
  if (
    hardwareConcurrency >= 8 &&
    (typeof deviceMemory !== "number" || deviceMemory >= 8) &&
    !coarsePointer
  )
    scale += 0.04;

  return Math.min(0.9, Math.max(0.64, scale));
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function EarthCesiumViewer({
  selectedCandidateId,
  onSelectCandidate,
  cameraAction,
  showCandidates,
  visualLayerEnabled,
  visibleCandidateIds,
}: EarthCesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const CesiumRef = useRef<typeof import("cesium") | null>(null);
  const imageryLayerRef = useRef<import("cesium").ImageryLayer | null>(null);
  const onSelectCandidateRef = useRef(onSelectCandidate);
  const selectedCandidateIdRef = useRef(selectedCandidateId);
  const cameraActionRef = useRef(cameraAction);
  const showCandidatesRef = useRef(showCandidates);
  const visualLayerEnabledRef = useRef(visualLayerEnabled);
  const visibleCandidateIdsRef = useRef(visibleCandidateIds);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [imageryUnavailable, setImageryUnavailable] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    onSelectCandidateRef.current = onSelectCandidate;
    selectedCandidateIdRef.current = selectedCandidateId;
    cameraActionRef.current = cameraAction;
    showCandidatesRef.current = showCandidates;
    visualLayerEnabledRef.current = visualLayerEnabled;
    visibleCandidateIdsRef.current = visibleCandidateIds;
  }, [
    cameraAction,
    onSelectCandidate,
    selectedCandidateId,
    showCandidates,
    visualLayerEnabled,
    visibleCandidateIds,
  ]);

  useEffect(() => {
    let disposed = false;
    let viewer: import("cesium").Viewer | null = null;
    let markerClickHandler: import("cesium").ScreenSpaceEventHandler | null =
      null;
    let imageryProvider: import("cesium").UrlTemplateImageryProvider | null =
      null;
    let imageryErrorListener: (() => void) | null = null;
    let contextCanvas: HTMLCanvasElement | null = null;
    let handleVisibilityChange: (() => void) | null = null;
    let handleContextLost: ((event: Event) => void) | null = null;
    let handleContextRestored: (() => void) | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let contextIsLost = false;
    let isIntersecting = true;

    const getCameraDuration = (duration: number) =>
      prefersReducedMotion() ? 0 : duration;

    async function createViewer() {
      try {
        const Cesium = await import("cesium");
        if (disposed || !containerRef.current) return;
        CesiumRef.current = Cesium;
        setFailed(false);
        setContextLost(false);
        setImageryUnavailable(false);

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: true,
          timeline: false,
          shouldAnimate: false,
          baseLayer: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });
        viewerRef.current = viewer;
        viewer.resolutionScale = getAdaptiveResolutionScale();
        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#07101a");
        viewer.scene.globe.baseColor =
          Cesium.Color.fromCssColorString("#102b43");
        viewer.scene.globe.enableLighting = false;
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
        if (viewer.scene.sun) viewer.scene.sun.show = false;
        if (viewer.scene.moon) viewer.scene.moon.show = false;
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1_400_000;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 28_000_000;

        const updateRenderLoop = () => {
          if (!viewer || viewer.isDestroyed()) return;
          const shouldRender =
            !contextIsLost &&
            document.visibilityState !== "hidden" &&
            isIntersecting;
          viewer.useDefaultRenderLoop = shouldRender;
          if (shouldRender) requestViewerRender(viewer);
        };

        handleVisibilityChange = () => updateRenderLoop();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        if (
          typeof IntersectionObserver !== "undefined" &&
          containerRef.current
        ) {
          intersectionObserver = new IntersectionObserver(entries => {
            isIntersecting = entries.some(
              entry => entry.isIntersecting || entry.intersectionRatio > 0
            );
            updateRenderLoop();
          });
          intersectionObserver.observe(containerRef.current);
        }

        contextCanvas = viewer.scene.canvas;
        handleContextLost = (event: Event) => {
          event.preventDefault();
          contextIsLost = true;
          if (viewer && !viewer.isDestroyed())
            viewer.useDefaultRenderLoop = false;
          if (!disposed) setContextLost(true);
        };
        handleContextRestored = () => {
          contextIsLost = false;
          if (!disposed) {
            setContextLost(false);
            updateRenderLoop();
            requestViewerRender(viewer);
          }
        };
        contextCanvas.addEventListener(
          "webglcontextlost",
          handleContextLost,
          false
        );
        contextCanvas.addEventListener(
          "webglcontextrestored",
          handleContextRestored,
          false
        );

        try {
          imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2019-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
            credit: new Cesium.Credit("NASA GIBS — visual context"),
            maximumLevel: 8,
          });
          imageryErrorListener = () => {
            if (!disposed) setImageryUnavailable(true);
          };
          imageryProvider.errorEvent.addEventListener(imageryErrorListener);
          imageryLayerRef.current =
            viewer.imageryLayers.addImageryProvider(imageryProvider);
          imageryLayerRef.current.show = visualLayerEnabledRef.current;
          requestViewerRender(viewer);
        } catch {
          setImageryUnavailable(true);
          // The base globe remains functional if an optional public imagery service is unavailable.
        }

        candidates.forEach(candidate => {
          const visibleInCurrentView =
            !visibleCandidateIdsRef.current ||
            visibleCandidateIdsRef.current.includes(candidate.id);
          viewer?.entities.add({
            id: candidate.id,
            position: Cesium.Cartesian3.fromDegrees(
              candidate.coordinate.longitude,
              candidate.coordinate.latitude,
              11000
            ),
            point: {
              pixelSize: 12,
              color: Cesium.Color.fromCssColorString("#e57a35"),
              outlineColor: Cesium.Color.fromCssColorString("#fff4df"),
              outlineWidth: 1.5,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: showCandidatesRef.current && visibleInCurrentView,
            },
            label: {
              text: candidate.title,
              font: "11px IBM Plex Mono, monospace",
              fillColor: Cesium.Color.fromCssColorString("#eaf2f6"),
              outlineColor: Cesium.Color.fromCssColorString("#07101a"),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(13, -3),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: showCandidatesRef.current && visibleInCurrentView,
            },
          });
        });
        requestViewerRender(viewer);

        const applyVisibility = () => {
          if (!viewer || viewer.isDestroyed()) return;
          candidates.forEach(candidate => {
            const entity = viewer?.entities.getById(candidate.id);
            if (!entity) return;
            const visibleInCurrentView =
              !visibleCandidateIdsRef.current ||
              visibleCandidateIdsRef.current.includes(candidate.id);
            const visible = showCandidatesRef.current && visibleInCurrentView;
            if (entity.point)
              entity.point.show = new Cesium.ConstantProperty(visible);
            if (entity.label)
              entity.label.show = new Cesium.ConstantProperty(visible);
          });
          requestViewerRender(viewer);
        };

        const applySelection = (flyToSelected: boolean) => {
          if (!viewer || viewer.isDestroyed()) return;
          const currentSelectedCandidateId = selectedCandidateIdRef.current;
          candidates.forEach(candidate => {
            const entity = viewer?.entities.getById(candidate.id);
            if (!entity?.point) return;
            const selected = candidate.id === currentSelectedCandidateId;
            entity.point.pixelSize = new Cesium.ConstantProperty(
              selected ? 16 : 12
            );
            entity.point.color = new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString(selected ? "#46c7d9" : "#e57a35")
            );
            entity.point.outlineWidth = new Cesium.ConstantProperty(
              selected ? 2.5 : 1.5
            );
          });
          const selectedEntity = currentSelectedCandidateId
            ? viewer.entities.getById(currentSelectedCandidateId)
            : undefined;
          if (selectedEntity) {
            viewer.selectedEntity = selectedEntity;
            if (flyToSelected)
              viewer.flyTo(selectedEntity, {
                duration: getCameraDuration(0.8),
              });
          }
          requestViewerRender(viewer);
        };

        const applyImageryVisibility = () => {
          if (!imageryLayerRef.current) return;
          imageryLayerRef.current.show = visualLayerEnabledRef.current;
          requestViewerRender(viewer);
        };

        const applyCameraAction = () => {
          if (!viewer || viewer.isDestroyed()) return;
          const currentCameraAction = cameraActionRef.current;
          if (currentCameraAction.nonce === 0) return;
          if (currentCameraAction.kind === "home") {
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(-20, 18, 14_600_000),
              duration: getCameraDuration(0.65),
            });
            requestViewerRender(viewer);
            return;
          }
          const magnitude = Cesium.Cartesian3.magnitude(viewer.camera.position);
          const scale = currentCameraAction.kind === "zoom-in" ? 0.68 : 1.42;
          const direction = Cesium.Cartesian3.normalize(
            viewer.camera.position,
            new Cesium.Cartesian3()
          );
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.multiplyByScalar(
              direction,
              clampEarthCameraDistance(magnitude * scale),
              new Cesium.Cartesian3()
            ),
            duration: getCameraDuration(0.35),
          });
          requestViewerRender(viewer);
        };

        viewer.selectedEntityChanged.addEventListener(entity => {
          const id = typeof entity?.id === "string" ? entity.id : undefined;
          if (id && candidates.some(candidate => candidate.id === id))
            onSelectCandidateRef.current(id);
        });
        markerClickHandler = new Cesium.ScreenSpaceEventHandler(
          viewer.scene.canvas
        );
        markerClickHandler.setInputAction(
          (
            movement: import("cesium").ScreenSpaceEventHandler.PositionedEvent
          ) => {
            const picked = viewer?.scene.pick(movement.position);
            const pickedId =
              typeof picked?.id === "string"
                ? picked.id
                : typeof picked?.id?.id === "string"
                  ? picked.id.id
                  : undefined;
            if (
              !pickedId ||
              !candidates.some(candidate => candidate.id === pickedId)
            )
              return;
            const entity = viewer?.entities.getById(pickedId);
            if (!entity || !viewer) return;
            viewer.selectedEntity = entity;
            onSelectCandidateRef.current(pickedId);
            requestViewerRender(viewer);
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        );

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-20, 18, 14_600_000),
          duration: 0,
        });
        applyVisibility();
        applySelection(true);
        applyImageryVisibility();
        applyCameraAction();
        updateRenderLoop();
        if (!disposed) setReady(true);
      } catch (error) {
        console.error("Earth explorer could not initialize", error);
        if (viewer && !viewer.isDestroyed()) viewer.destroy();
        viewerRef.current = null;
        CesiumRef.current = null;
        imageryLayerRef.current = null;
        if (!disposed) {
          setReady(false);
          setFailed(true);
        }
      }
    }

    createViewer();
    return () => {
      disposed = true;
      if (handleVisibilityChange)
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      intersectionObserver?.disconnect();
      if (contextCanvas) {
        if (handleContextLost)
          contextCanvas.removeEventListener(
            "webglcontextlost",
            handleContextLost
          );
        if (handleContextRestored)
          contextCanvas.removeEventListener(
            "webglcontextrestored",
            handleContextRestored
          );
      }
      if (imageryProvider && imageryErrorListener)
        imageryProvider.errorEvent.removeEventListener(imageryErrorListener);
      if (markerClickHandler && !markerClickHandler.isDestroyed())
        markerClickHandler.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      CesiumRef.current = null;
      imageryLayerRef.current = null;
    };
  }, [retryToken]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = CesiumRef.current;
    if (!viewer || !Cesium) return;
    candidates.forEach(candidate => {
      const entity = viewer.entities.getById(candidate.id);
      if (!entity) return;
      const visibleInCurrentView =
        !visibleCandidateIds || visibleCandidateIds.includes(candidate.id);
      const visible = showCandidates && visibleInCurrentView;
      if (entity.point)
        entity.point.show = new Cesium.ConstantProperty(visible);
      if (entity.label)
        entity.label.show = new Cesium.ConstantProperty(visible);
    });
    requestViewerRender(viewer);
  }, [showCandidates, visibleCandidateIds]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = CesiumRef.current;
    if (!viewer || !Cesium) return;
    candidates.forEach(candidate => {
      const entity = viewer.entities.getById(candidate.id);
      if (!entity?.point) return;
      const selected = candidate.id === selectedCandidateId;
      entity.point.pixelSize = new Cesium.ConstantProperty(selected ? 16 : 12);
      entity.point.color = new Cesium.ConstantProperty(
        Cesium.Color.fromCssColorString(selected ? "#46c7d9" : "#e57a35")
      );
      entity.point.outlineWidth = new Cesium.ConstantProperty(
        selected ? 2.5 : 1.5
      );
    });
    if (selectedCandidateId) {
      const entity = viewer.entities.getById(selectedCandidateId);
      if (entity) {
        viewer.selectedEntity = entity;
        viewer.flyTo(entity, { duration: prefersReducedMotion() ? 0 : 0.8 });
      }
    }
    requestViewerRender(viewer);
  }, [selectedCandidateId]);

  useEffect(() => {
    const imageryLayer = imageryLayerRef.current;
    if (!imageryLayer) return;
    imageryLayer.show = visualLayerEnabled;
    requestViewerRender(viewerRef.current);
  }, [visualLayerEnabled]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = CesiumRef.current;
    if (!viewer || !Cesium || cameraAction.nonce === 0) return;
    if (cameraAction.kind === "home") {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-20, 18, 14_600_000),
        duration: prefersReducedMotion() ? 0 : 0.65,
      });
      requestViewerRender(viewer);
      return;
    }
    const magnitude = Cesium.Cartesian3.magnitude(viewer.camera.position);
    const scale = cameraAction.kind === "zoom-in" ? 0.68 : 1.42;
    const direction = Cesium.Cartesian3.normalize(
      viewer.camera.position,
      new Cesium.Cartesian3()
    );
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.multiplyByScalar(
        direction,
        clampEarthCameraDistance(magnitude * scale),
        new Cesium.Cartesian3()
      ),
      duration: prefersReducedMotion() ? 0 : 0.35,
    });
    requestViewerRender(viewer);
  }, [cameraAction]);

  const retryViewer = () => {
    setReady(false);
    setFailed(false);
    setContextLost(false);
    setRetryToken(token => token + 1);
  };

  if (failed) {
    return (
      <div className="cesium-host" aria-label="Interactive Earth globe">
        <PlanetFallback body="earth" error />
        <div className="scene-load" role="alert" aria-live="assertive">
          <div>
            <strong>EARTH GLOBE UNAVAILABLE</strong>
            <button
              type="button"
              onClick={retryViewer}
              style={{ display: "block", margin: "1rem auto 0" }}
            >
              RETRY EARTH GLOBE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cesium-host" aria-label="Interactive Earth globe">
      <div ref={containerRef} className="cesium-host__canvas" />
      {!ready && (
        <div className="scene-load" role="status" aria-live="polite">
          <span className="spin-ring" /> INITIALIZING EARTH GLOBE
        </div>
      )}
      {imageryUnavailable && !contextLost && (
        <div
          className="scene-load"
          role="status"
          aria-live="polite"
          style={{
            inset: "auto 12px 12px",
            justifyContent: "flex-start",
            padding: ".45rem .6rem",
            pointerEvents: "none",
          }}
        >
          IMAGERY UNAVAILABLE — USING BASE GLOBE
        </div>
      )}
      {contextLost && (
        <div className="scene-load" role="alert" aria-live="assertive">
          <div>
            <strong>EARTH GLOBE CONTEXT LOST</strong>
            <p style={{ margin: ".6rem 0 0" }}>
              The globe is paused. Retry to restore this view.
            </p>
            <button
              type="button"
              onClick={retryViewer}
              style={{ display: "block", margin: "1rem auto 0" }}
            >
              RETRY EARTH GLOBE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
