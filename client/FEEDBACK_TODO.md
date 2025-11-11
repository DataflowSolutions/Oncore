# Feedback Implementation Todo List

**Date:** November 11, 2025
**Source:** Feedback from responsible human being

## Status Legend

- [ ] Not Started
- [⏳] In Progress
- [✅] Complete

---

## 1. Profile Icon & Settings Layout

**Status:** [✅]
**Priority:** High
**Description:** Add a profile icon at the top right where users can choose which artists should be visible. Move the settings button to the right of the profile icon.
**Location:** Header/Navbar component

---

## 2. Remove Update Button

**Status:** [✅]
**Priority:** Medium
**Description:** Remove the update button from the top right. Let it update automatically instead.
**Location:** Header/Navbar component

---

## 3. Notifications Reconsideration

**Status:** [✅]
**Priority:** Low
**Description:** Decide if notifications should exist at all. If yes, maybe move to bottom left in the bar instead.
**Location:** Navigation bar
**Notes:** Needs decision - keep or remove?

---

## 4. Logo Font Change

**Status:** [✅]
**Priority:** High
**Description:** Replace logo with bold version using only lowercase letters. Font: Special Gothic Expanded One (https://fonts.google.com/specimen/Special+Gothic+Expanded+One)
**Location:** Logo component/assets

---

## 5. Search Bar Placeholder Text

**Status:** [✅]
**Priority:** Low
**Description:** Change search bar placeholder text to "Search anything"
**Location:** Search component

---

## 6. Search Behavior - Google-like Expansion

**Status:** [✅]
**Priority:** High
**Description:** Instead of popup, make search behave like Google - search field expands downward (not as popup, just expanding under the field)
**Location:** Search component

---

## 7. Remove Horizontal Lines in Sidebar

**Status:** [✅]
**Priority:** Low
**Description:** Remove both horizontal lines at the top of the left sidebar (under logo and under search)
**Location:** Left sidebar component

---

## 8. Show Click Navigation

**Status:** [✅]
**Priority:** High
**Description:** When clicking on a show, go directly to day view instead of an intermediate page
**Location:** Show routing/navigation logic

---

## 9. "Back to Shows" Button Spacing

**Status:** [✅]
**Priority:** Low
**Description:** Keep the "back to shows" button (with various names on different pages), but on show page it's too close to the text below - add spacing
**Location:** Show page layout

---

## 10. Selected Sidebar Item Styling

**Status:** [✅]
**Priority:** Medium
**Description:** When selecting a subpage from left sidebar, make the selected item slightly gray instead of full white
**Location:** Left sidebar component CSS/styling

---

## 11. Color Hierarchy Selection

**Status:** [ ]
**Priority:** Medium
**Description:** Need to choose different colors for page hierarchy
**Location:** Global theme/styling
**Notes:** Awaiting further instructions

---

## 12. Typography Selection

**Status:** [ ]
**Priority:** Medium
**Description:** Need to choose typeface for the site
**Location:** Global theme/styling
**Notes:** Awaiting further instructions

---

## 13-17: Day View Updates

**Note:** Everything between 13-17 is about day view, which doesn't match the Lovable implementation

### 13. Full Day Schedule Display

**Status:** [ ]
**Priority:** High
**Description:** Show entire day schedule from 00-24 in hourly increments. Include day selector within the card (currently outside the card)
**Location:** Day view component

### 14. Generate Test Data

**Status:** [ ]
**Priority:** Medium
**Description:** Ask AI to generate test data so flights and other items can be seen
**Location:** Test data/mock data files

### 15. Key Contacts Layout Update

**Status:** [ ]
**Priority:** Medium
**Description:**

- Make role text smaller under key contacts
- Place role text under the name instead
- Include buttons for phone number and email
- Phone button should open WhatsApp chat
  **Location:** Key contacts component

### 16. Top Right Buttons

**Status:** [ ]
**Priority:** Medium
**Description:** Missing buttons at top right. For now, just implement the "team" button (others come later)
**Location:** Day view header

### 17. Event Status Indicator

**Status:** [✅]
**Priority:** High
**Description:** Add status indicator showing if event is "pending" or "confirmed"
**Location:** Event/show display component
**Notes:** Already exists - status badge is shown in show detail page

---

## 18. Advancing Section

**Status:** [ ]
**Priority:** Low
**Description:** Hold off on more changes to Advancing - won't be released in beta but good to have ready
**Location:** Advancing component
**Notes:** On hold

---

## 19-21: Sidebar Changes

### 19. Remove Home Page

**Status:** [✅]
**Priority:** High
**Description:** Remove "home" from sidebar - list view will be the home page for now
**Location:** Sidebar navigation

### 20. Remove Current Show Info from Sidebar

**Status:** [✅]
**Priority:** Medium
**Description:** Remove current show info (team & advancing) from sidebar. This info will be in day view page. Overview page won't exist since day view is the main page for a specific show
**Location:** Sidebar component

### 21. Add Day View Above Shows

**Status:** [✅]
**Priority:** High
**Description:** Add "day view" above "shows" in the sidebar. It should be the most recently accessed one if applicable
**Location:** Sidebar navigation

---

## 22. List View Row Height Reduction

**Status:** [✅]
**Priority:** Medium
**Description:** Each row in list view is too thick. Reduce height by 30-40% and adjust the info layout to match Lovable design
**Location:** List view component

---

## 23. Organization Login Flow

**Status:** [ ]
**Priority:** Medium
**Description:** There's a page where you write org when logging in - this should happen automatically or not be on the login page
**Location:** Login/authentication flow
**Notes:** Needs discussion

---

## Implementation Notes

- Focus on high-priority items first
- Items 11 and 12 await further instructions
- Item 18 (Advancing) is on hold
- Item 23 needs discussion before implementation
