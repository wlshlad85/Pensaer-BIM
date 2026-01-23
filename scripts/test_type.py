"""Quick test using keyboard library for Enter"""
import pyautogui
import keyboard
import time

pyautogui.FAILSAFE = True

print("Click in terminal NOW - typing 'status' in 3 seconds...")
time.sleep(3)

# Type with pyautogui
pyautogui.write('status', interval=0.1)
time.sleep(0.3)

# Use keyboard library for Enter
keyboard.press_and_release('enter')

print("Done!")
