from PIL import ImageGrab
from numpy import array
import requests
import json

while True:
    screenshot = array(ImageGrab.grab())
    averageColor = screenshot.mean(axis = 0).mean(axis = 0)
    data = json.dumps({ "deskNet": list(averageColor / 256) })
    requests.put("http://10.0.0.52:8088/networkOptions.json", data=data)
