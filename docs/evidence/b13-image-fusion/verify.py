"""Offline verification only. Run browser.cjs first from the repository root."""

import json
from importlib.metadata import version
from pathlib import Path

import cv2
import numpy as np
import zxingcpp


def variants(image):
    height, width = image.shape[:2]
    yield "native", image
    for name, divisor in (("half", 2), ("quarter", 4)):
        yield name, cv2.resize(image, (round(width / divisor), round(height / divisor)), interpolation=cv2.INTER_AREA)
    yield "blur07", cv2.GaussianBlur(image, (0, 0), 0.7)
    yield "blur12", cv2.GaussianBlur(image, (0, 0), 1.2)
    encoded, jpeg = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 70])
    assert encoded
    yield "jpeg70", cv2.imdecode(jpeg, cv2.IMREAD_COLOR)


def decode(detector, image, expected):
    try:
        text, _, _ = detector.detectAndDecode(image)
        opencv = "pass" if text.encode("utf-8") == expected else "fail"
    except (UnicodeError, cv2.error):
        opencv = "error"
    try:
        symbols = zxingcpp.read_barcodes(image, formats=zxingcpp.BarcodeFormat.QRCode)
        zxing = "pass" if any(symbol.bytes == expected for symbol in symbols) else "fail"
    except RuntimeError:
        zxing = "error"
    return {"opencv": opencv, "zxing": zxing}


def contact_sheet(directory, pngs):
    sources = Path("src/lab/image-fusion/samples")
    size, spacing, footer = 200, 16, 34
    columns = ("Source", "Blend", "Colored Halftone", "Hybrid")
    cases = ("chromatic-72", "graphic-72", "graphic-no-constraint")
    height = len(cases) * (size + footer + spacing) + spacing
    width = len(columns) * (size + spacing) + spacing
    sheet = np.full((height, width, 3), 242, dtype=np.uint8)
    for row, case in enumerate(cases):
        source = case.split("-")[0]
        list_of_files = [sources / f"source_{source}.png"] + [
            pngs / f"{case}-fusion-{method}.png" for method in ("blend", "halftone", "hybrid")
        ]
        for col, (file, title) in enumerate(zip(list_of_files, columns)):
            image = cv2.imdecode(np.frombuffer(file.read_bytes(), dtype=np.uint8), cv2.IMREAD_COLOR)
            x = spacing + col * (size + spacing)
            y = spacing + row * (size + footer + spacing)
            sheet[y:y + size, x:x + size] = cv2.resize(image, (size, size), interpolation=cv2.INTER_AREA)
            label = case if col == 0 else title
            cv2.putText(sheet, label, (x, y + size + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.47, (28, 28, 28), 1, cv2.LINE_AA)
    ok, png = cv2.imencode(".png", sheet)
    assert ok
    (directory / "contact-sheet.png").write_bytes(png.tobytes())


def verify():
    directory = Path(__file__).parent
    pngs = Path("node_modules/.cache/fusion-browser")
    reference = json.loads((directory / "browser-results.json").read_text(encoding="utf-8"))
    detector = cv2.QRCodeDetector()
    records = []
    for sample in reference["samples"]:
        expected = sample["parameters"]["content"].encode("utf-8")
        results = []
        for method in sample["results"]:
            path = pngs / f"{sample['id']}-fusion-{method['method']}.png"
            image = cv2.imdecode(np.frombuffer(path.read_bytes(), dtype=np.uint8), cv2.IMREAD_COLOR)
            assert image.shape[:2] == (sample["parameters"]["size"],) * 2
            scans = {name: decode(detector, frame, expected) for name, frame in variants(image)}
            results.append({"method": method["method"], "scans": scans})
        records.append({"id": sample["id"], "results": results})
    data = {"opencv": cv2.__version__, "zxing": version("zxing-cpp"), "samples": records}
    (directory / "offline-decode.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    contact_sheet(directory, pngs)
    print(f"Verified {len(records)} comparisons with OpenCV and ZXing.")


if __name__ == "__main__":
    verify()
