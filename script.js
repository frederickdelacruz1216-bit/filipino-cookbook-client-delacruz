/* =====================================================
   Filipino Cookbook Client - Main Application
   Consumes a RESTful API for Filipino cuisine data.
   ===================================================== */

/* ---------- Configuration ---------- */

const BASE_URL = "http://localhost/filipino-cookbook-api/public/api";

const TOKEN = "Bearer dmmmsu-cookbook-token-2026";

const REQUEST_TIMEOUT_MS = 15000;

/* ---------- State ---------- */

let state = {
  foods: [],
  categories: [],
  foodsCache: null,
  categoriesCache: null,
  activeCategory: null,
  searchQuery: '',
  isLoading: false,
  currentView: 'empty',
};

/* ---------- DOM References ---------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {
  overlay: $('#loading-overlay'),
  status: $('#status-alert'),
  grid: $('#content-grid'),
  resultsBar: $('#results-bar'),
  resultsCount: $('#results-count'),
  activeFilters: $('#active-filters'),
  emptyState: $('#empty-state'),

  btnFoods: $('#btn-load-foods'),
  btnCategories: $('#btn-load-categories'),
  btnRefresh: $('#btn-refresh'),
  btnAddFood: $('#btn-add-food'),

  searchInput: $('#search-input'),
  clearSearch: $('#btn-clear-search'),

  modalOverlay: $('#modal-overlay'),
  modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'),
  modalClose: $('#modal-close-btn'),

  footerBtns: $$('.footer-link-btn'),
  footerYear: $('#footer-year'),

  // Food Form Modal
  foodFormOverlay: $('#food-form-overlay'),
  foodFormTitle: $('#food-form-title'),
  foodFormClose: $('#food-form-close-btn'),
  foodForm: $('#food-form'),
  foodFormId: $('#food-form-id'),
  foodFormName: $('#food-form-name'),
  foodFormCategory: $('#food-form-category'),
  foodFormOrigin: $('#food-form-origin'),
  foodFormIngredientSelect: $('#food-form-ingredient-select'),
  foodFormIngredientIds: $('#food-form-ingredient-ids'),
  foodFormInstructions: $('#food-form-instructions'),
  selectedIngredients: $('#selected-ingredients'),
  btnAddIngredient: $('#btn-add-ingredient'),
  btnFormCancel: $('#btn-form-cancel'),
  btnFormSubmit: $('#btn-form-submit'),
  errorFoodName: $('#error-food-name'),
  errorFoodCategory: $('#error-food-category'),
  errorFoodOrigin: $('#error-food-origin'),
  errorFoodIngredients: $('#error-food-ingredients'),
  errorFoodInstructions: $('#error-food-instructions'),

  // Delete Confirmation Modal
  deleteConfirmOverlay: $('#delete-confirm-overlay'),
  deleteConfirmTitle: $('#delete-confirm-title'),
  deleteConfirmClose: $('#delete-confirm-close-btn'),
  deleteConfirmText: $('#delete-confirm-text'),
  deleteConfirmId: $('#delete-confirm-id'),
  deleteConfirmName: $('#delete-confirm-name'),
  btnDeleteCancel: $('#btn-delete-cancel'),
  btnDeleteConfirm: $('#btn-delete-confirm'),
};

/* ---------- Helper: Authentication Check ---------- */

function getAuthHeaders() {
  return {
    Authorization: TOKEN,
    Accept: 'application/json',
  };
}

/* ---------- Helper: Safe Fetch with Timeout ---------- */

async function apiFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401) {
      throw new ApiError('Unauthorized Access', 401);
    }

    if (response.status === 404) {
      throw new ApiError('The requested resource was not found.', 404);
    }

    if (response.status >= 500) {
      throw new ApiError('Internal Server Error. Please try again later.', response.status);
    }

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}.`, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new ApiError('Invalid response format from server.', -1);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('Failed to parse server response.', -1);
    }

    return data;
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof ApiError) throw err;

    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection and try again.', -1);
    }

    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new ApiError('Network error. Please check your internet connection.', -1);
    }

    throw new ApiError('An unexpected error occurred. Please try again.', -1);
  }
}

/* ---------- Custom Error Class ---------- */

class ApiError extends Error {
  constructor(message, status = -1) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* ---------- Helper: Loading State ---------- */

function showLoading() {
  state.isLoading = true;
  dom.overlay.hidden = false;
  dom.btnFoods.disabled = true;
  dom.btnCategories.disabled = true;
  dom.btnRefresh.disabled = true;
}

function hideLoading() {
  state.isLoading = false;
  dom.overlay.hidden = true;
  dom.btnFoods.disabled = false;
  dom.btnCategories.disabled = false;
  dom.btnRefresh.disabled = false;
}

/* ---------- Helper: Status Alert ---------- */

function showAlert(message, type = 'error') {
  dom.status.textContent = message;
  dom.status.className = `status-alert ${type}`;
  dom.status.hidden = false;

  setTimeout(() => {
    dom.status.hidden = true;
  }, 6000);
}

function hideAlert() {
  dom.status.hidden = true;
}

/* ---------- Helper: Empty State ---------- */

function renderDefaultEmptyState() {
  dom.grid.innerHTML = `
    <div class="empty-state">
      <svg class="empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h2 class="empty-title">Welcome!</h2>
      <p class="empty-text">Click <strong>Load Foods</strong> to browse our collection of authentic Filipino recipes, or click <strong>Load Categories</strong> to explore by type.</p>
    </div>
  `;
  dom.resultsBar.hidden = true;
  state.currentView = 'empty';
}

function renderNoRecordsFound() {
  dom.grid.innerHTML = `
    <div class="empty-state">
      <svg class="empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <h2 class="empty-title">No records found.</h2>
      <p class="empty-text">Try adjusting your search or filter to find what you're looking for.</p>
    </div>
  `;
  dom.resultsBar.hidden = true;
}

function renderErrorState(message) {
  dom.grid.innerHTML = `
    <div class="empty-state empty-state-error">
      <svg class="empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <h2 class="empty-title">Something went wrong</h2>
      <p class="empty-text">${escapeHtml(message)}</p>
    </div>
  `;
  dom.resultsBar.hidden = true;
}

/* ---------- Helper: Escape HTML ---------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Helper: Food Card ---------- */

function createFoodCard(food) {
  const id = food.id ?? food.food_id;

  const name = extractField(food, "name", "food_name", "title") || "Unknown Food";

  const category =
    extractField(food, "category", "category_name") || "Uncategorized";

  const origin =
    extractField(food, "origin", "origin_name", "place_of_origin") ||
    "Unknown Origin";

  const instructions =
    extractField(food, "instructions", "description", "instruction") || "";

  const image = extractField(food, "image", "image_url", "thumbnail");

  const preview = instructions
    ? (instructions.split(/[.\n]/).filter(Boolean)[0] || instructions).slice(0, 150)
    : "No instructions available.";

  const card = document.createElement("article");
  card.className = "food-card";
  card.dataset.id = id;
  card.setAttribute("role", "article");

  const hasImage =
    typeof image === "string" &&
    image.trim() !== "";

  card.innerHTML = `
    ${
      hasImage
        ? `
          <img
            class="food-card-image"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(name)}"
            loading="lazy"
          >
        `
        : `
          <div class="food-card-image-placeholder" aria-hidden="true">
            🍽️
          </div>
        `
    }

    <div class="food-card-body">

      <h3 class="food-card-title">
        ${escapeHtml(name)}
      </h3>

      <div class="food-card-meta">
        <span class="food-card-badge category">
          ${escapeHtml(category)}
        </span>

        <span class="food-card-badge origin">
          ${escapeHtml(origin)}
        </span>
      </div>

      <p class="food-card-preview">
        ${escapeHtml(preview)}
      </p>

      <div class="food-card-actions">
        <button
          class="btn-details"
          data-id="${id}"
          aria-label="View details for ${escapeHtml(name)}">
          View Details
        </button>
        <button
          class="btn-card-edit"
          data-id="${id}"
          aria-label="Edit ${escapeHtml(name)}">
          Edit
        </button>
        <button
          class="btn-card-delete"
          data-id="${id}"
          aria-label="Delete ${escapeHtml(name)}">
          Delete
        </button>
      </div>

    </div>
  `;

  return card;
}

/* ---------- Helper: Extract Field ---------- */

function extractField(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

/* ---------- Helper: Determine Data Shape (Auto-adapt) ---------- */

function normalizeFoodItem(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }

    return {
        ...item,

        id: item.food_id ?? item.id,

        name: item.food_name ?? item.name,

        category: item.category_name ?? item.category,

        origin: item.origin_name ?? item.origin ?? item.place_of_origin,

        instructions:
            item.instructions ??
            item.description ??
            item.instruction,

        ingredients:
            item.ingredients ??
            item.ingredient ??
            item.ingredient_list
    };
}

function normalizeFoodsResponse(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
        return data.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.data)) {
        return data.data.map(normalizeFoodItem).filter(Boolean);
    }

    if (data.data && Array.isArray(data.data.foods)) {
        return data.data.foods.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.foods)) {
        return data.foods.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.recipes)) {
        return data.recipes.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.results)) {
        return data.results.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.items)) {
        return data.items.map(normalizeFoodItem).filter(Boolean);
    }

    if (Array.isArray(data.records)) {
        return data.records.map(normalizeFoodItem).filter(Boolean);
    }

    return [];
}

function normalizeCategoriesResponse(data) {

    if (!data) return [];

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (data.data && Array.isArray(data.data.categories)) {
        return data.data.categories;
    }

    if (Array.isArray(data.categories)) {
        return data.categories;
    }

    if (Array.isArray(data.results)) {
        return data.results;
    }

    if (Array.isArray(data.items)) {
        return data.items;
    }

    if (Array.isArray(data.records)) {
        return data.records;
    }

    return [];
}

function normalizeFoodDetail(data) {

    if (!data) {
        return null;
    }

    let detail = data;

    if (data.data && typeof data.data === 'object') {
        detail = data.data;
    } else if (data.food && typeof data.food === 'object') {
        detail = data.food;
    } else if (data.recipe && typeof data.recipe === 'object') {
        detail = data.recipe;
    } else if (data.detail && typeof data.detail === 'object') {
        detail = data.detail;
    } else if (data.result && typeof data.result === 'object') {
        detail = data.result;
    }

    return normalizeFoodItem(detail);
}

/* ---------- Category Helpers ---------- */

function getCategoryValue(cat) {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object') {
    return cat.name || cat.category_name || cat.category || cat.ingredient_name || cat.origin_name || cat.title || cat.type || cat.label || '';
  }
  return '';
}

function getCategoryId(cat) {
  if (cat && typeof cat === 'object') {
    return cat.id || cat.category_id || cat.ingredient_id || cat.origin_id || cat.ID || 0;
  }
  return typeof cat === 'string' ? cat : 0;
}

function getFoodCategoryValue(food) {
    return extractField(
        food,
        'category',
        'category_name',
        'category_type'
    ) || '';
}

/* =====================================================
   RENDER FUNCTIONS
   ===================================================== */

function renderFoods(foods) {
  if (!foods || foods.length === 0) {
    renderNoRecordsFound();
    dom.resultsBar.hidden = true;
    return;
  }

  dom.resultsBar.hidden = false;
  dom.resultsCount.textContent = `Showing ${foods.length} food${foods.length !== 1 ? 's' : ''}`;

  renderActiveFilterTag();

  const fragment = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.className = 'food-grid';

  foods.forEach((food) => {
    const card = createFoodCard(food);
    grid.appendChild(card);
  });

  fragment.appendChild(grid);
  dom.grid.innerHTML = '';
  dom.grid.appendChild(fragment);
  state.currentView = 'foods';
}

function renderCategories(categories) {
  if (!categories || categories.length === 0) {
    renderNoRecordsFound();
    dom.resultsBar.hidden = true;
    return;
  }

  dom.resultsBar.hidden = true;

  const fragment = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.className = 'category-grid';

  categories.forEach((cat) => {
    const name = getCategoryValue(cat);
    if (!name) return;

    const id = getCategoryId(cat);
    const card = document.createElement('button');
    card.className = 'category-card';
    card.setAttribute('aria-label', `Filter by ${name}`);
    card.dataset.category = String(id);
    card.dataset.categoryName = name;

    if (state.activeCategory && String(state.activeCategory) === String(id)) {
      card.classList.add('active');
    }

    const foods = state.foodsCache || [];

    const foodCount = foods.filter((f) => {
      const fc = getFoodCategoryValue(f);
      return fc.toLowerCase() === name.toLowerCase();
    }).length;

    card.innerHTML = `
      <div class="category-card-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/>
        </svg>
      </div>
      <span class="category-card-name">${escapeHtml(name)}</span>
      <span class="category-card-count">${foodCount} food${foodCount !== 1 ? 's' : ''}</span>
    `;

    card.addEventListener('click', () => handleCategoryClick(id, name));
    grid.appendChild(card);
  });

  fragment.appendChild(grid);
  dom.grid.innerHTML = '';
  dom.grid.appendChild(fragment);
  state.currentView = 'categories';
}

function renderActiveFilterTag() {
  if (!state.activeCategory) {
    dom.activeFilters.innerHTML = '';
    return;
  }

  const name = state.activeCategory;
  dom.activeFilters.innerHTML = `
    <span class="filter-tag">
      Category: ${escapeHtml(name)}
      <button id="clear-filter-btn" aria-label="Clear category filter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>
  `;

  const clearBtn = $('#clear-filter-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.activeCategory = null;
      applyFilters();
    });
  }
}

/* =====================================================
   FILTER & SEARCH
   ===================================================== */

function applyFilters() {
  let filtered = state.foodsCache ? [...state.foodsCache] : [];

  const query = state.searchQuery.trim().toLowerCase();

  if (query) {
    filtered = filtered.filter((food) => {
      const name = extractField(food, 'name', 'food_name', 'title') || '';
      const category = extractField(food, 'category', 'category_name') || '';
      const origin = extractField(
    food,
    'origin',
    'origin_name',
    'place_of_origin'
) || '';
      const instructions = extractField(food, 'instructions', 'description', 'instruction') || '';
      const combined = `${name} ${category} ${origin} ${instructions}`.toLowerCase();
      return combined.includes(query);
    });
  }

  if (state.activeCategory) {
    const catName = state.activeCategory;
    filtered = filtered.filter((food) => {
      const fc = getFoodCategoryValue(food);
      return fc.toLowerCase() === catName.toLowerCase();
    });
  }

  state.foods = filtered;

  if (
    state.currentView === 'foods' ||
    state.currentView === 'empty' ||
    state.activeCategory
  ) {
    renderFoods(filtered);
  } else if (state.currentView === 'categories' && state.categoriesCache) {
    renderCategories(state.categoriesCache);
  }
}

function handleCategoryClick(id, name) {
  if (!state.foodsCache || state.foodsCache.length === 0) {
    showAlert('Please load foods first before filtering by category.', 'info');
    return;
  }

  if (state.activeCategory === name) {
    state.activeCategory = null;
  } else {
    state.activeCategory = name;
  }

  const catCards = $$('.category-card');
  catCards.forEach((card) => {
    const cardName = card.dataset.categoryName;
    card.classList.toggle('active', cardName === state.activeCategory);
  });

  applyFilters();
}

/* =====================================================
   API ACTIONS
   ===================================================== */

async function loadFoods() {
  if (state.isLoading) return;

  if (state.foodsCache) {
    state.foods = [...state.foodsCache];
    state.activeCategory = null;
    state.searchQuery = '';
    dom.searchInput.value = '';
    dom.clearSearch.hidden = true;
    renderFoods(state.foods);
    showAlert('Foods loaded from cache.', 'success');
    return;
  }

  showLoading();
  hideAlert();

  try {
    const url = `${BASE_URL}/foods`;
    const data = await apiFetch(url);

    const foods = normalizeFoodsResponse(data);

    if (!foods || foods.length === 0) {
      state.foodsCache = [];
      state.foods = [];
      renderNoRecordsFound();
      showAlert('No foods found.', 'info');
      return;
    }

    state.foodsCache = [...foods];
    console.log("Foods:", foods);
    state.foods = [...foods];
    state.activeCategory = null;
    state.searchQuery = '';
    dom.searchInput.value = '';
    dom.clearSearch.hidden = true;

    renderFoods(foods);
    showAlert(`Successfully loaded ${foods.length} food${foods.length !== 1 ? 's' : ''}.`, 'success');
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(err.message);
      if (err.status === 401) {
        renderErrorState('Unauthorized Access');
      } else {
        renderErrorState(err.message);
      }
    } else {
      showAlert('An unexpected error occurred.');
      renderErrorState('An unexpected error occurred.');
    }
  } finally {
    hideLoading();
  }
}

async function loadCategories() {
  if (state.isLoading) return;

  if (state.categoriesCache) {
    state.categories = [...state.categoriesCache];
    renderCategories(state.categories);
    showAlert('Categories loaded from cache.', 'success');
    return;
  }

  showLoading();
  hideAlert();

  try {
    const url = `${BASE_URL}/categories`;
    const data = await apiFetch(url);

    const categories = normalizeCategoriesResponse(data);

    if (!categories || categories.length === 0) {
      state.categoriesCache = [];
      state.categories = [];
      renderNoRecordsFound();
      showAlert('No categories found.', 'info');
      return;
    }

    state.categoriesCache = [...categories];
    console.log("Categories:", categories);
    state.categories = [...categories];

    renderCategories(categories);
    showAlert(`Loaded ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}.`, 'success');
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(err.message);
      if (err.status === 401) {
        renderErrorState('Unauthorized Access');
      } else {
        renderErrorState(err.message);
      }
    } else {
      showAlert('An unexpected error occurred.');
      renderErrorState('An unexpected error occurred.');
    }
  } finally {
    hideLoading();
  }
}

async function loadFoodDetails(id) {
  if (state.isLoading) return;

  showLoading();
  hideAlert();

  try {
    const url = `${BASE_URL}/foods/${encodeURIComponent(id)}`;
    const data = await apiFetch(url);

    const detail = normalizeFoodDetail(data);

    if (!detail) {
      showAlert('Food details not found.', 'error');
      return;
    }

    openModal(detail);
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(err.message);
      if (err.status === 401) {
        renderErrorState('Unauthorized Access');
      }
    } else {
      showAlert('Failed to load food details.');
    }
  } finally {
    hideLoading();
  }
}

/* =====================================================
   MODAL
   ===================================================== */

function openModal(detail) {
  const name = extractField(detail, 'name', 'food_name', 'title') || 'Food Details';
  const category = extractField(detail, 'category', 'category_name') || '';
  const origin = extractField(
    detail,
    'origin',
    'origin_name',
    'place_of_origin'
) || '';
  const instructions = extractField(detail, 'instructions', 'description', 'instruction') || 'No instructions available.';
  const ingredients = extractIngredients(detail);

  dom.modalTitle.textContent = name;

  const ingredientsHtml = ingredients.length > 0
    ? `<ul class="ingredients-list">${ingredients.map((ing) => `<li class="ingredient-item">${escapeHtml(ing)}</li>`).join('')}</ul>`
    : '<p class="modal-description">No ingredients listed.</p>';

  dom.modalBody.innerHTML = `
    <div class="modal-meta-grid">
      ${category ? `
        <div class="modal-meta-item">
          <div class="modal-meta-label">Category</div>
          <div class="modal-meta-value">${escapeHtml(category)}</div>
        </div>
      ` : ''}
      ${origin ? `
        <div class="modal-meta-item">
          <div class="modal-meta-label">Origin</div>
          <div class="modal-meta-value">${escapeHtml(origin)}</div>
        </div>
      ` : ''}
    </div>

    <div class="modal-section">
      <h3 class="modal-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Complete Instructions
      </h3>
      <p class="modal-description">${escapeHtml(instructions)}</p>
    </div>

    <div class="modal-section">
      <h3 class="modal-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Ingredients
      </h3>
      ${ingredientsHtml}
    </div>
  `;

  dom.modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';

  dom.modalClose.focus();
}

function extractIngredients(detail) {
  if (!detail) return [];

  const ingField = extractField(detail, 'ingredients', 'ingredient_list', 'ingredient', 'items');
  if (!ingField) return [];

  if (Array.isArray(ingField)) {
    return ingField.map((ing) => {
      if (typeof ing === 'string') return ing;
      if (ing && typeof ing === 'object') {
        return ing.name || ing.item || ing.ingredient || String(ing);
      }
      return String(ing);
    }).filter(Boolean);
  }

  if (typeof ingField === 'string') {
    return ingField
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function closeModal() {
  dom.modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

/* =====================================================
   SEARCH HANDLERS
   ===================================================== */

function handleSearchInput(e) {
  const query = e.target.value;
  state.searchQuery = query;

  if (query.length > 0) {
    dom.clearSearch.hidden = false;
  } else {
    dom.clearSearch.hidden = true;
  }

  if (!state.foodsCache || state.foodsCache.length === 0) {
    return;
  }

  applyFilters();
}

function clearSearch() {
  state.searchQuery = '';
  dom.searchInput.value = '';
  dom.clearSearch.hidden = true;
  dom.searchInput.focus();

  if (state.foodsCache && state.foodsCache.length > 0) {
    applyFilters();
  }
}

/* =====================================================
   RESET / REFRESH
   ===================================================== */

function handleRefresh() {
  state.foodsCache = null;
  state.categoriesCache = null;
  state.foods = [];
  state.categories = [];
  state.activeCategory = null;
  state.searchQuery = '';
  dom.searchInput.value = '';
  dom.clearSearch.hidden = true;

  closeModal();
  renderDefaultEmptyState();
  hideAlert();
  showAlert('Data cache cleared. Ready to reload.', 'info');
}

/* =====================================================
   CRUD: API HELPERS
   ===================================================== */

/* Helper: Fetch with JSON body (POST/PUT/DELETE) */
async function apiFetchWithBody(url, method = 'POST', body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const fetchOptions = {
    method,
    headers: getAuthHeaders(),
    signal: controller.signal,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timer);

    if (response.status === 401) {
      throw new ApiError('Unauthorized Access', 401);
    }
    if (response.status === 404) {
      throw new ApiError('The requested resource was not found.', 404);
    }
    if (response.status >= 500) {
      throw new ApiError('Internal Server Error. Please try again later.', response.status);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.message || `Request failed with status ${response.status}.`;
      throw new ApiError(errMsg, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new ApiError('Invalid response format from server.', -1);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('Failed to parse server response.', -1);
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection and try again.', -1);
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new ApiError('Network error. Please check your internet connection.', -1);
    }
    throw new ApiError('An unexpected error occurred. Please try again.', -1);
  }
}

/* ---------- Cache: Ingredients, Categories, Origins ---------- */
let _ingredientsCache = null;
let _originsCache = null;

async function loadFormDropdowns() {
  const promises = [];

  // Load categories if not cached
  if (!state.categoriesCache) {
    promises.push(
      apiFetch(`${BASE_URL}/categories`).then(data => {
        state.categoriesCache = normalizeCategoriesResponse(data);
      })
    );
  }

  // Load ingredients
  if (!_ingredientsCache) {
    promises.push(
      apiFetch(`${BASE_URL}/ingredients`).then(data => {
        const norm = normalizeCategoriesResponse(data);
        _ingredientsCache = norm;
      })
    );
  }

  // Load origins
  if (!_originsCache) {
    promises.push(
      apiFetch(`${BASE_URL}/origins`).then(data => {
        const norm = normalizeCategoriesResponse(data);
        _originsCache = norm;
      })
    );
  }

  await Promise.all(promises);
}

function populateFormDropdowns() {
  // Populate categories
  const catSelect = dom.foodFormCategory;
  catSelect.innerHTML = '<option value="">Select category...</option>';
  if (state.categoriesCache) {
    state.categoriesCache.forEach(cat => {
      const id = getCategoryId(cat);
      const name = getCategoryValue(cat);
      if (id && name) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        catSelect.appendChild(opt);
      }
    });
  }

  // Populate origins
  const originSelect = dom.foodFormOrigin;
  originSelect.innerHTML = '<option value="">Select origin...</option>';
  if (_originsCache) {
    _originsCache.forEach(orig => {
      const id = getCategoryId(orig);
      const name = getCategoryValue(orig);
      if (id && name) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        originSelect.appendChild(opt);
      }
    });
  }

  // Populate ingredients
  const ingSelect = dom.foodFormIngredientSelect;
  ingSelect.innerHTML = '<option value="">Add ingredient...</option>';
  if (_ingredientsCache) {
    _ingredientsCache.forEach(ing => {
      const id = getCategoryId(ing);
      const name = getCategoryValue(ing);
      if (id && name) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        ingSelect.appendChild(opt);
      }
    });
  }
}

/* =====================================================
   CRUD: FOOD FORM MODAL
   ===================================================== */

let foodFormMode = 'create'; // 'create' or 'edit'
let selectedIngredientIds = [];

function resetFoodFormErrors() {
  dom.errorFoodName.textContent = '';
  dom.errorFoodCategory.textContent = '';
  dom.errorFoodOrigin.textContent = '';
  dom.errorFoodIngredients.textContent = '';
  dom.errorFoodInstructions.textContent = '';
  dom.foodFormName.classList.remove('error');
  dom.foodFormCategory.classList.remove('error');
  dom.foodFormOrigin.classList.remove('error');
  dom.foodFormInstructions.classList.remove('error');
}

function resetFoodForm() {
  dom.foodFormId.value = '';
  dom.foodFormName.value = '';
  dom.foodFormCategory.value = '';
  dom.foodFormOrigin.value = '';
  dom.foodFormInstructions.value = '';
  selectedIngredientIds = [];
  renderSelectedIngredients();
  resetFoodFormErrors();
}

function renderSelectedIngredients() {
  const container = dom.selectedIngredients;
  container.innerHTML = '';
  if (!_ingredientsCache) return;

  selectedIngredientIds.forEach(id => {
    const ing = _ingredientsCache.find(i => String(getCategoryId(i)) === String(id));
    if (!ing) return;
    const name = getCategoryValue(ing);
    const tag = document.createElement('span');
    tag.className = 'ingredient-tag';
    tag.innerHTML = `
      ${escapeHtml(name)}
      <span class="ingredient-tag-remove" data-ingredient-id="${id}" aria-label="Remove ${escapeHtml(name)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
    `;
    container.appendChild(tag);
  });

  // Attach remove handlers
  container.querySelectorAll('.ingredient-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const ingId = btn.dataset.ingredientId;
      selectedIngredientIds = selectedIngredientIds.filter(id => String(id) !== String(ingId));
      renderSelectedIngredients();
      dom.errorFoodIngredients.textContent = '';
    });
  });
}

dom.btnAddIngredient.addEventListener('click', () => {
  const select = dom.foodFormIngredientSelect;
  const value = select.value;
  if (!value) return;
  if (selectedIngredientIds.includes(value)) {
    showAlert('This ingredient is already added.', 'info');
    return;
  }
  selectedIngredientIds.push(value);
  renderSelectedIngredients();
  dom.errorFoodIngredients.textContent = '';
  select.value = '';
});

async function openFoodFormModal(mode = 'create', foodData = null) {
  foodFormMode = mode;
  resetFoodFormErrors();

  // Load dropdown data if needed
  await loadFormDropdowns();
  populateFormDropdowns();

  if (mode === 'create') {
    dom.foodFormTitle.textContent = 'Add Food';
    dom.btnFormSubmit.textContent = 'Save Food';
    resetFoodForm();
  } else if (mode === 'edit' && foodData) {
    dom.foodFormTitle.textContent = 'Edit Food';
    dom.btnFormSubmit.textContent = 'Update Food';

    dom.foodFormId.value = foodData.food_id || foodData.id || '';
    dom.foodFormName.value = foodData.food_name || foodData.name || '';
    dom.foodFormCategory.value = foodData.category_id || '';
    dom.foodFormOrigin.value = foodData.origin_id || '';
    dom.foodFormInstructions.value = foodData.instructions || '';

    selectedIngredientIds = foodData.ingredient_ids ? [...foodData.ingredient_ids] : [];
    renderSelectedIngredients();
  }

  dom.foodFormOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  dom.foodFormName.focus();
}

function closeFoodFormModal() {
  dom.foodFormOverlay.hidden = true;
  document.body.style.overflow = '';
}

function validateFoodForm() {
  let valid = true;
  resetFoodFormErrors();

  const name = dom.foodFormName.value.trim();
  const category = dom.foodFormCategory.value;
  const origin = dom.foodFormOrigin.value;
  const instructions = dom.foodFormInstructions.value.trim();

  if (!name) {
    dom.errorFoodName.textContent = 'Food Name is required.';
    dom.foodFormName.classList.add('error');
    valid = false;
  }

  if (!category) {
    dom.errorFoodCategory.textContent = 'Category is required.';
    dom.foodFormCategory.classList.add('error');
    valid = false;
  }

  if (!origin) {
    dom.errorFoodOrigin.textContent = 'Origin is required.';
    dom.foodFormOrigin.classList.add('error');
    valid = false;
  }

  if (!instructions) {
    dom.errorFoodInstructions.textContent = 'Complete Instructions are required.';
    dom.foodFormInstructions.classList.add('error');
    valid = false;
  }

  if (selectedIngredientIds.length === 0) {
    dom.errorFoodIngredients.textContent = 'At least one ingredient is required.';
    valid = false;
  }

  return valid;
}

async function handleFoodFormSubmit(e) {
  e.preventDefault();

  if (!validateFoodForm()) return;

  const name = dom.foodFormName.value.trim();
  const categoryId = parseInt(dom.foodFormCategory.value, 10);
  const originId = parseInt(dom.foodFormOrigin.value, 10);
  const instructions = dom.foodFormInstructions.value.trim();
  const ingredientIds = selectedIngredientIds.map(id => parseInt(id, 10));

  showLoading();
  hideAlert();

  try {
    if (foodFormMode === 'create') {
      const url = `${BASE_URL}/foods`;
      const result = await apiFetchWithBody(url, 'POST', {
        food_name: name,
        category_id: categoryId,
        origin_id: originId,
        instructions: instructions,
        ingredient_ids: ingredientIds,
      });

      closeFoodFormModal();
      // Reload foods from server to get the new item with all data
      state.foodsCache = null;
      state.categoriesCache = null;
      await loadFoods();
      showAlert('Food added successfully!', 'success');
    } else if (foodFormMode === 'edit') {
      const foodId = dom.foodFormId.value;
      const url = `${BASE_URL}/foods/${encodeURIComponent(foodId)}`;
      const result = await apiFetchWithBody(url, 'PUT', {
        food_name: name,
        category_id: categoryId,
        origin_id: originId,
        instructions: instructions,
        ingredient_ids: ingredientIds,
      });

      closeFoodFormModal();
      // Reload foods from server to get updated data
      state.foodsCache = null;
      state.categoriesCache = null;
      await loadFoods();
      showAlert('Food updated successfully!', 'success');
    }
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(err.message);
    } else {
      showAlert('An unexpected error occurred.');
    }
  } finally {
    hideLoading();
  }
}

/* =====================================================
   CRUD: DELETE CONFIRMATION
   ===================================================== */

function openDeleteConfirmModal(foodId, foodName) {
  dom.deleteConfirmId.value = foodId;
  dom.deleteConfirmName.value = foodName;
  dom.deleteConfirmText.textContent = `Are you sure you want to delete ${foodName}?`;

  dom.deleteConfirmOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  dom.btnDeleteCancel.focus();
}

function closeDeleteConfirmModal() {
  dom.deleteConfirmOverlay.hidden = true;
  document.body.style.overflow = '';
}

async function handleDeleteConfirm() {
  const foodId = dom.deleteConfirmId.value;
  const foodName = dom.deleteConfirmName.value;
  if (!foodId) return;

  showLoading();
  hideAlert();

  try {
    const url = `${BASE_URL}/foods/${encodeURIComponent(foodId)}`;
    await apiFetchWithBody(url, 'DELETE');

    closeDeleteConfirmModal();

    // Remove from cache
    if (state.foodsCache) {
      state.foodsCache = state.foodsCache.filter(f => {
        const id = f.food_id ?? f.id;
        return String(id) !== String(foodId);
      });
    }

    // Refresh UI
    if (state.currentView === 'foods' || state.currentView === 'empty') {
      applyFilters();
    }

    showAlert(`"${foodName}" has been deleted.`, 'success');
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(err.message);
    } else {
      showAlert('Failed to delete food.');
    }
  } finally {
    hideLoading();
  }
}

/* =====================================================
   CRUD: EVENT DELEGATION FOR EDIT/DELETE BUTTONS
   ===================================================== */

dom.grid.addEventListener('click', async (e) => {
  // Edit button
  const editBtn = e.target.closest('.btn-card-edit');
  if (editBtn) {
    const id = editBtn.dataset.id;
    if (id !== undefined && id !== null) {
      try {
        showLoading();
        const url = `${BASE_URL}/foods/${encodeURIComponent(id)}`;
        const data = await apiFetch(url);
        const detail = normalizeFoodDetail(data);
        if (detail) {
          await openFoodFormModal('edit', detail);
        } else {
          showAlert('Could not load food details for editing.', 'error');
        }
      } catch (err) {
        if (err instanceof ApiError) {
          showAlert(err.message);
        } else {
          showAlert('Failed to load food details.');
        }
      } finally {
        hideLoading();
      }
    }
    return;
  }

  // Delete button
  const deleteBtn = e.target.closest('.btn-card-delete');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const card = deleteBtn.closest('.food-card');
    const nameEl = card ? card.querySelector('.food-card-title') : null;
    const name = nameEl ? nameEl.textContent : 'this food';
    if (id !== undefined && id !== null) {
      openDeleteConfirmModal(id, name);
    }
    return;
  }
});

/* =====================================================
   EVENT LISTENERS
   ===================================================== */

/* Navigation Buttons */
dom.btnFoods.addEventListener('click', loadFoods);
dom.btnCategories.addEventListener('click', loadCategories);
dom.btnRefresh.addEventListener('click', handleRefresh);
dom.btnAddFood.addEventListener('click', () => openFoodFormModal('create'));

/* Search */
dom.searchInput.addEventListener('input', handleSearchInput);
dom.clearSearch.addEventListener('click', clearSearch);

/* Modal */
dom.modalClose.addEventListener('click', closeModal);

dom.modalOverlay.addEventListener('click', (e) => {
  if (e.target === dom.modalOverlay) {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.modalOverlay.hidden) {
    closeModal();
  }
});

/* Delegate: Food Details Button Clicks */
dom.grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-details');
  if (!btn) return;

  const id = btn.dataset.id;
  if (id !== undefined && id !== null) {
    loadFoodDetails(id);
  }
});

/* Food Form Modal Events */
dom.foodFormClose.addEventListener('click', closeFoodFormModal);
dom.btnFormCancel.addEventListener('click', closeFoodFormModal);
dom.foodForm.addEventListener('submit', handleFoodFormSubmit);

dom.foodFormOverlay.addEventListener('click', (e) => {
  if (e.target === dom.foodFormOverlay) {
    closeFoodFormModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.foodFormOverlay.hidden) {
    closeFoodFormModal();
  }
});

/* Delete Confirmation Modal Events */
dom.deleteConfirmClose.addEventListener('click', closeDeleteConfirmModal);
dom.btnDeleteCancel.addEventListener('click', closeDeleteConfirmModal);
dom.btnDeleteConfirm.addEventListener('click', handleDeleteConfirm);

dom.deleteConfirmOverlay.addEventListener('click', (e) => {
  if (e.target === dom.deleteConfirmOverlay) {
    closeDeleteConfirmModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.deleteConfirmOverlay.hidden) {
    closeDeleteConfirmModal();
  }
});

/* Footer Navigation */
dom.footerBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'foods') {
      loadFoods();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'categories') {
      loadCategories();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

/* Footer Year */
if (dom.footerYear) {
  dom.footerYear.textContent = new Date().getFullYear();
}

/* =====================================================
   INITIALIZATION
   ===================================================== */

renderDefaultEmptyState();

