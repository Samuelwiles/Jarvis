import cv2
import mediapipe as mp
import speech_recognition as sr
import pyttsx3
import threading
import math

# Initialize Text-to-Speech
engine = pyttsx3.init()
def speak(text):
    engine.say(text)
    engine.runAndWait()

# Global variables to share data between Voice and Vision threads
listen_for_resize = False
box_size = 150  # Starting size of our object

def voice_thread():
    """Listens for voice commands in the background"""
    global listen_for_resize
    r = sr.Recognizer()
    
    speak("Vision systems online, Sir.")
    print("[Voice] Listening for commands...")
    
    while True:
        with sr.Microphone() as source:
            r.pause_threshold = 0.8
            audio = r.listen(source)
            
        try:
            query = r.recognize_google(audio, language='en-US').lower()
            print(f"[Voice] User said: {query}")
            
            if "resize" in query:
                speak("Adjusting size with your hand now.")
                listen_for_resize = True
            elif "lock" in query or "stop" in query:
                speak("Size locked.")
                listen_for_resize = False
            elif "exit" in query or "shutdown" in query:
                speak("Goodbye, Sir.")
                cv2.destroyAllWindows()
                break
        except Exception:
            pass

# Start the voice listener in a separate thread so it doesn't freeze the camera
threading.Thread(target=voice_thread, daemon=True).start()

# Initialize MediaPipe Hands and OpenCV Camera
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

print("[Vision] Camera starting...")
while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # Flip frame horizontally for a mirror view
    frame = cv2.flip(frame, 1)
    h, w, c = frame.shape
    
    # Convert BGR to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_frame)

    if results.multi_hand_landmarks:
        for hand_lms in results.multi_hand_landmarks:
            # Draw the hand skeleton on screen
            mp_draw.draw_landmarks(frame, hand_lms, mp_hands.HAND_CONNECTIONS)
            
            # Get coordinates for Thumb Tip (ID 4) and Index Tip (ID 8)
            thumb = hand_lms.landmark[4]
            index = hand_lms.landmark[8]
            
            x1, y1 = int(thumb.x * w), int(thumb.y * h)
            x2, y2 = int(index.x * w), int(index.y * h)
            
            # Draw circles on thumb and index finger
            cv2.circle(frame, (x1, y1), 10, (0, 255, 0), cv2.FILLED)
            cv2.circle(frame, (x2, y2), 10, (0, 255, 0), cv2.FILLED)
            cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
            
            # Calculate the distance between thumb and index
            distance = math.hypot(x2 - x1, y2 - y1)
            
            # If user said "resize", update box size based on finger distance
            if listen_for_resize:
                box_size = int(distance * 1.5)
                # Keep box size within reasonable limits
                box_size = max(20, min(box_size, 400))

    # Draw the holographic-style box in the center of the screen
    cx, cy = w // 2, h // 2
    top_left = (cx - box_size // 2, cy - box_size // 2)
    bottom_right = (cx + box_size // 2, cy + box_size // 2)
    
    # Color changes to green when actively resizing
    box_color = (0, 255, 0) if listen_for_resize else (255, 0, 0)
    cv2.rectangle(frame, top_left, bottom_right, box_color, 3)
    
    # Add status text to the screen
    status = "RESIZING MODE" if listen_for_resize else "SAY 'RESIZE'"
    cv2.putText(frame, status, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, box_color, 2)

    # Show the video feed
    cv2.imshow("JARVIS Vision HUD", frame)
    
    # Break loop if 'q' is pressed on keyboard
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
