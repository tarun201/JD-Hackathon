import sys
import cv2

video_path = sys.argv[1]
cap = cv2.VideoCapture(video_path)

frame_count = 0
blurry_count = 0

while frame_count < 30:
    ret, frame = cap.read()
    if not ret:
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 100:
        blurry_count += 1
    frame_count += 1

cap.release()
print("blurry" if blurry_count / frame_count > 0.5 else "clear")
