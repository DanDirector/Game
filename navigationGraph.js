export const navigationGraph = {
  "platform-start-left": ["platform-low-far-left"],
  "platform-low-far-left": ["platform-mid-step-left"],
  "platform-mid-step-left": ["platform-mid-center-left"],
  "platform-mid-center-left": ["platform-upper-mid-left"],
  "platform-upper-mid-left": ["platform-high-far-left"],
  "platform-high-far-left": ["platform-top-left"],
  "platform-start-right": ["platform-low-far-right"],
  "platform-low-far-right": ["platform-mid-step-right"],
  "platform-mid-step-right": ["platform-mid-center-right"],
  "platform-mid-center-right": ["platform-upper-mid-right"],
  "platform-upper-mid-right": ["platform-high-far-right"],
  "platform-high-far-right": ["platform-top-right"],
  "platform-low-center": ["platform-mid-center-left", "platform-mid-center-right"],
  "platform-mid-center-left": ["platform-upper-mid-center"],
  "platform-mid-center-right": ["platform-upper-mid-center"],
  "platform-upper-mid-center": ["platform-top-center"],
  // Центр соединяет левую и правую части
  "platform-top-center": ["platform-top-left", "platform-top-right"],
  "platform-top-left": ["platform-top-center"],
  "platform-top-right": ["platform-top-center"]
};
