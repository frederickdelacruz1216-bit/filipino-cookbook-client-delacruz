# Filipino Cookbook Client

A responsive, single-page web application that consumes a RESTful API to browse and explore authentic Filipino cuisine. Built with vanilla JavaScript, semantic HTML, and modern CSS — no frameworks, no build tools, no external libraries.

---

## Project Overview

The **Filipino Cookbook Client** is a university laboratory activity that demonstrates the ability to build a production-quality, API-driven frontend application from scratch. It dynamically fetches food and category data from a backend REST API and presents it in an elegant, responsive, and accessible user interface.

The application features a hero header, sticky navigation, client-side search, category filtering, a dynamic food card grid, a modal detail view, loading states, error handling, empty states, and a professional footer.

---

## Objectives

- Demonstrate proficiency in consuming RESTful APIs using `fetch()` and `async/await`.
- Implement client-side data caching to minimize redundant network requests.
- Build a fully responsive, mobile-first user interface without CSS frameworks.
- Apply modern JavaScript patterns: reusable helper functions, state management, event delegation.
- Implement robust error handling for network failures, invalid tokens, empty responses, and server errors.
- Ensure accessibility with semantic HTML, ARIA labels, keyboard navigation, and focus management.
- Deliver a polished, portfolio-ready design inspired by Filipino cuisine color themes.

---

## Features

| Feature                  | Description |
|--------------------------|-------------|
| **Load Foods**           | Fetches all foods from `GET /foods` and renders them as equal-height cards with hover animations. |
| **Load Categories**      | Fetches all categories from `GET /categories` and renders interactive category cards. |
| **Category Filtering**   | Click a category to filter already-loaded foods by that category. No extra API calls. |
| **Client-Side Search**   | Real-time, case-insensitive search across food names, categories, origins, and instructions. |
| **Food Details Modal**   | Click "View Details" on any food card to open a modal with complete instructions and ingredients. |
| **Modal UX**             | Close via ESC key, close button, or click outside. Body scrolling is locked while open. |
| **Loading Spinner**      | Professional animated spinner overlay during API requests; buttons disabled to prevent duplicate requests. |
| **Empty State**          | Attractive placeholder illustrations when no data is available. |
| **Error Handling**       | Friendly UI alerts for 401 Unauthorized, 404 Not Found, 500 errors, network failures, and timeouts. |
| **Data Caching**         | Loaded foods and categories are cached in memory; repeated clicks use cache instead of re-fetching. |
| **Responsive Design**    | Seamlessly adapts to desktop, tablet, and mobile viewports. |
| **Accessibility**        | Skip-to-content link, semantic headings, ARIA labels, focus-visible outlines, accessible modal. |

---

## Technologies Used

- **HTML5** — Semantic markup with ARIA attributes.
- **CSS3** — Custom properties, Flexbox, CSS Grid, animations, media queries, backdrop filter.
- **Vanilla JavaScript (ES6+)** — `fetch()`, `async/await`, modules pattern, event delegation.
- **Google Fonts** — Playfair Display (headings) and Inter (body text).
- **No Frameworks** — No Bootstrap, Tailwind, React, Vue, Angular, jQuery, or TypeScript.
- **No Build Tools** — No npm, Webpack, Babel, or package.json.

---

## Requirements

- A modern web browser (Chrome, Firefox, Edge, Safari).
- The backend API server must be running at the configured `BASE_URL`.
- No internet connection is required except for Google Fonts (optional; the app works without them).

---

## Folder Structure

```
filipino-cookbook-client-delacruz/
│
├── index.html           # Main HTML document
├── style.css            # Complete stylesheet
├── script.js            # Application logic
├── README.md            # Project documentation
└── screenshots/         # Screenshots directory (optional)
    └── .gitignore
```

---

## Installation Instructions

1. **Clone or download** this repository to your local machine.

2. **Ensure the backend API is running** at:
   ```
   http://localhost/filipino-cookbook-api/public/api
   ```
   The API must expose the following endpoints:
   - `GET /foods`
   - `GET /foods/{id}`
   - `GET /categories`

3. **Open `index.html`** in your web browser.

No build steps, no dependency installation, and no server required for the client itself.

---

## Running the Application

1. Double-click `index.html` or open it with your browser.
2. The welcome screen appears with a prompt to load foods or categories.
3. Click **Load Foods** to fetch and display all food items.
4. Click **Load Categories** to fetch and display all categories.
5. Click on a category card to filter the already-loaded foods.
6. Use the **Search Bar** to search foods in real time.
7. Click **View Details** on any food card to open the detailed modal.
8. Click **Refresh** to clear the cache and start fresh.

---

## API Base URL

```
http://localhost/filipino-cookbook-api/public/api
```

This value is stored as `BASE_URL` in `script.js`.

---

## Configuration Instructions

All API configuration is done in `script.js` at the top of the file.

### BASE_URL

The `BASE_URL` constant defines the root endpoint of the backend API:

```
js
const BASE_URL = "http://localhost/filipino-cookbook-api/public/api";
```

To use a different API server, replace this value with your own API base URL.

### TOKEN

The `TOKEN` constant defines the authorization token sent with every request:

```js
const TOKEN = "Bearer dmmmsu-cookbook-token-2026";
```

To use a different token or authentication scheme, replace this value accordingly. If an invalid token is provided, the application gracefully displays an **"Unauthorized Access"** message.

### How to Configure

1. Open `script.js` in any text editor.
2. Locate the configuration block at the very top of the file.
3. Replace `BASE_URL` with your API server's base URL.
4. Replace `TOKEN` with your valid authorization token.
5. Save the file and refresh `index.html` in your browser.

No other configuration is required.

---

## Endpoints Used

| Method | Endpoint         | Description             |
|--------|------------------|-------------------------|
| GET    | `/foods`         | Fetch all food items    |
| GET    | `/foods/{id}`    | Fetch a single food     |
| GET    | `/categories`    | Fetch all categories    |
| GET    | `/ingredients`   | Fetch all ingredients   |
| GET    | `/origins`       | Fetch all origins       |
| POST   | `/foods`         | Create a new food       |
| PUT    | `/foods/{id}`    | Update an existing food |
| DELETE | `/foods/{id}`    | Delete a food           |

---

## Application Workflow

```
┌──────────────┐
│  App Loads   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│   Welcome / Empty State      │
│   "Click Load Foods or       │
│    Load Categories"          │
└──────┬───────────────────────┘
       │
       ├──► Load Foods ──────────► GET /foods ──► Render Food Cards
       │                              │
       │                              ▼
       │                        ┌──────────────┐
       │                        │  Food Cards   │
       │                        │  with View    │
       │                        │  Details Btn  │
       │                        └──────┬───────┘
       │                               │
       │                         Click Details
       │                               │
       │                               ▼
       │                        GET /foods/{id}
       │                               │
       │                               ▼
       │                        ┌──────────────┐
       │                        │  Modal with   │
       │                        │  Full Details │
       │                        └──────────────┘
       │
       ├──► Load Categories ──► GET /categories ──► Render Category Cards
       │                              │
       │                              ▼
       │                        ┌──────────────┐
       │                        │ Click Category│
       │                        │ (Filters      │
       │                        │  loaded foods)│
       │                        └──────────────┘
       │
       ├──► Search ──────────► Filters cached foods (client-side)
       │
       └──► Refresh ─────────► Clears cache, resets to welcome state
```

---

## Screenshots

### 01-load-foods.png

Shows the application after successfully loading all foods from the API.

### 02-view-details.png

Shows the food details modal with complete instructions and ingredients.

### 03-categories.png

Shows the category cards displayed after loading categories from the API.

### 04-search.png

Shows the search results after typing a query in the search bar.

### 05-filter.png

Shows the food grid filtered by a selected category.

### 06-add-food.png

Shows the Add Food form modal for creating a new food entry.

### 07-create-food.png

Shows the confirmation message after successfully creating a new food.

### 08-edit-food.png

Shows the Edit Food form modal pre-filled with existing food data.

### 09-delete-food.png

Shows the delete confirmation modal before deleting a food.

### 10-deleted-food.png

Shows the application state after a food has been successfully deleted.

### 11-invalid-search.png

Shows the empty state when a search query returns no matching results.

---

## API Source

### API Developer

JENARD IBAL CASUGA

### Repository

https://github.com/kyuzan12/filipino-cookbook-api-casuga

---


## ACKNOWLEDGEMENT

### API Developer

FREDERICK DELA CRUZ

### Repository

https://github.com/frederickdelacruz1216-bit/filipino-cookbook-api-delacruz

---

## License

This project is for academic purposes only. All rights reserved.

---

## Troubleshooting

| Problem                          | Likely Cause                              | Solution |
|----------------------------------|-------------------------------------------|----------|
| "Network error" alert            | API server is not running                 | Start the backend API server |
| "Unauthorized Access" alert      | Invalid or missing token                  | Check `TOKEN` in `script.js` |
| "Request timed out" alert        | Server is slow or unreachable             | Verify the server URL and connection |
| No data displayed                | API returned empty response               | Check the API database has data |
| Categories show 0 foods          | Foods not loaded yet                      | Click "Load Foods" first |
| CSS not loading                  | `style.css` missing or renamed            | Ensure `style.css` is in the same directory |
| Modal not closing                | JavaScript error in console               | Check for syntax errors in `script.js` |
| Search not working               | Foods not cached                          | Click "Load Foods" before searching |

---

*Built with passion for Filipino cuisine.*

