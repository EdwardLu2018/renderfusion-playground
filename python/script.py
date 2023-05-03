import json
import argparse

if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument("raw_data", type=str)
	parser.add_argument("output_data", type=str)
	args = parser.parse_args()
	
	raw2 = []
	f = open(args.raw_data, "r")
	for line in f.read().split("\n"):
		if (line.startswith("compositor.js:166 [frame id] ")):
			val = float(line.replace("compositor.js:166 [frame id] ", ""))
			if (val < 225):
				raw2 += [val]

	with open(args.output_data, "w") as f:
		f.write(json.dumps(raw2))