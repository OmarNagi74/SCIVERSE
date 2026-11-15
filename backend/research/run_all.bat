@echo off
rem TerraTwin: pull everything, then score and train. Run from this folder.
pip install requests numpy scikit-learn
rem The Earth tables in data/ already hold geology flags that scrape_all.py does not produce,
rem so this pulls only the three large Moon/Mars grids and leaves them untouched.
python scrape_all.py mars mcd moon
python terratwin_model.py
python terratwin_ai.py evaluate
python terratwin_ai.py train
pause
