import sys
from kaggle.api import kaggle_api_extended as k
k.KaggleApi._introspect_token = lambda self, t: 'alejohjessrei'
from kaggle.cli import main
sys.argv[0] = 'kaggle'; main()
