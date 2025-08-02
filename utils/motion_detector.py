import sys
import cv2

video_path = sys.argv[1]
cap = cv2.VideoCapture(video_path)

motion_score = 0
_, prev = cap.read()

if prev is None:
    print("static")
    sys.exit()

prev_gray = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)

for _ in range(30):
    ret, curr = cap.read()
    if not ret:
        break
    curr_gray = cv2.cvtColor(curr, cv2.COLOR_BGR2GRAY)
    diff = cv2.absdiff(prev_gray, curr_gray)
    score = diff.sum()
    if score > 1_000_000:
        motion_score += 1
    prev_gray = curr_gray

cap.release()
print("motion" if motion_score > 5 else "static")
