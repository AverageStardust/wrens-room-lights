from board import D21
from neopixel import NeoPixel
import json
import sys
from time import time, sleep

ledCount = int(sys.argv[1])
updatesPerSecond = 30

pixels = NeoPixel(D21, ledCount, auto_write = False)
nextWriteTime = time()
lastWriteId = -1

while True:
	nextWriteTime += 1 / updatesPerSecond
	delayLeft = nextWriteTime - time()
	if (delayLeft < 0.2 / updatesPerSecond):
		delayLeft = 0.2 / updatesPerSecond
		nextWriteTime = time()
	sleep(delayLeft)

	jsonFile = None
	try:
		jsonFile = open("/dev/shm/roomLightData.json")
	except FileNotFoundError:
		continue

	jsonData = None
	try:
		jsonData = json.load(jsonFile)
	except json.decoder.JSONDecodeError:
		continue

	jsonFile.close()

	writeId = jsonData['writeId']
	colors = jsonData['colors']

	if (lastWriteId == writeId): 
		continue
	lastWriteId = writeId

	for i in range(0, min(ledCount, len(colors))):
		if (len(colors[i]) != 3): break
		pixels[i] = (colors[i][1] * 255, colors[i][0] * 255, colors[i][2] * 255)

	pixels.show()
