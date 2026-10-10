(function () {
  const CATEGORIES = [
    'recommended',
    'rating',
    'year',
    'copyright',
    'character',
    'count_gender',
    'artist',
    'general',
    'meta',
  ];
  const DEFAULT_ORDER = CATEGORIES.slice();
  const FALLBACK_LANGUAGE = 'en';

  let modalRoot = null;
  let presetsData = null;
  let configData = null;
  let localesData = {};
  let userLanguage = 'auto';
  let currentLanguage = FALLBACK_LANGUAGE;
  let currentTab = 'txt2img';
  let modelSelect = null;
  let queryInput = null;
  let resolutionCheckbox = null;
  let sortOrderCheckbox = null;
  let languageSelect = null;
  let categoryGroup = null;
  const categoryCheckboxes = {};
  const categoryRows = {};
  const bindings = [];

  function dispatchInputEvent(target) {
    const event = new Event('input', { bubbles: true });
    Object.defineProperty(event, 'target', { value: target, enumerable: true });
    target.dispatchEvent(event);
  }

  function t(key) {
    const current = localesData[currentLanguage];
    if (current && current[key] !== undefined) return current[key];
    const fallback = localesData[FALLBACK_LANGUAGE];
    if (fallback && fallback[key] !== undefined) return fallback[key];
    return key;
  }

  function hasTranslation(key) {
    return t(key) !== key;
  }

  function bindText(element, key, attribute) {
    bindings.push({ element: element, key: key, attribute: attribute || 'textContent' });
  }

  function applyLocale() {
    bindings.forEach(function (binding) {
      const value = t(binding.key);
      if (binding.attribute === 'placeholder') {
        binding.element.placeholder = value;
      } else if (binding.attribute === 'title') {
        binding.element.title = value;
      } else {
        binding.element.textContent = value;
      }
    });
  }

  function matchLocale(value) {
    if (!value || typeof value !== 'string') return '';
    const lowered = value.trim().toLowerCase();
    if (!lowered || lowered === 'auto') return '';
    const codes = Object.keys(localesData);
    for (let index = 0; index < codes.length; index += 1) {
      if (codes[index].toLowerCase() === lowered) return codes[index];
    }
    const base = lowered.split('-')[0];
    for (let index = 0; index < codes.length; index += 1) {
      if (codes[index].toLowerCase() === base) return codes[index];
    }
    return '';
  }

  function normalizeSavedLanguage(value) {
    return matchLocale(value) || 'auto';
  }

  function resolveLanguage() {
    const explicit = matchLocale(userLanguage);
    if (explicit) return explicit;
    const fromDocument = matchLocale(document.documentElement.lang);
    if (fromDocument) return fromDocument;
    return FALLBACK_LANGUAGE;
  }

  function showToast(message, isError) {
    const toast = document.createElement('div');
    toast.className = 'dbi-toast' + (isError ? ' dbi-toast-error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('dbi-toast-visible');
    });
    setTimeout(function () {
      toast.classList.remove('dbi-toast-visible');
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    return await response.json();
  }

  async function loadPresets() {
    presetsData = await fetchJson('/danbooru_importer/presets');
  }

  async function loadConfig() {
    configData = await fetchJson('/danbooru_importer/config');
  }

  async function loadLocales() {
    const payload = await fetchJson('/danbooru_importer/locales');
    localesData = payload.locales || {};
  }

  async function saveConfig() {
    await fetchJson('/danbooru_importer/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    });
  }

  function getAllowedCategories(modelKey) {
    const presets = presetsData && presetsData.presets ? presetsData.presets : {};
    const preset = presets[modelKey];
    const order =
      preset && Array.isArray(preset.category_sort_order)
        ? preset.category_sort_order
        : DEFAULT_ORDER;
    return order.filter(function (cat) {
      return CATEGORIES.indexOf(cat) !== -1;
    });
  }

  function updateCategoryVisibility() {
    const allowed = getAllowedCategories(modelSelect.value);
    allowed.forEach(function (cat) {
      categoryRows[cat].style.display = '';
      categoryCheckboxes[cat].disabled = false;
      categoryGroup.appendChild(categoryRows[cat]);
    });
    CATEGORIES.forEach(function (cat) {
      if (allowed.indexOf(cat) !== -1) return;
      categoryRows[cat].style.display = 'none';
      categoryCheckboxes[cat].disabled = true;
      categoryGroup.appendChild(categoryRows[cat]);
    });
  }

  function createCheckboxRow(labelKey) {
    const row = document.createElement('label');
    row.className = 'dbi-checkbox-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    const span = document.createElement('span');
    bindText(span, labelKey);
    row.appendChild(checkbox);
    row.appendChild(span);
    return { row: row, checkbox: checkbox };
  }

  function createActionButton(className, key, mode) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    bindText(button, key);
    if (mode) {
      button.addEventListener('click', function () {
        handleAction(mode);
      });
    } else {
      button.addEventListener('click', closeModal);
    }
    return button;
  }

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'dbi-modal-overlay';
    overlay.style.display = 'none';

    const modal = document.createElement('div');
    modal.className = 'dbi-modal';

    const header = document.createElement('div');
    header.className = 'dbi-modal-header';
    const title = document.createElement('span');
    bindText(title, 'title');

    const headerActions = document.createElement('div');
    headerActions.className = 'dbi-header-actions';

    const languageWrap = document.createElement('div');
    languageWrap.className = 'dbi-lang';
    const globe = document.createElement('span');
    globe.className = 'dbi-lang-globe';
    globe.textContent = '\uD83C\uDF10';
    languageSelect = document.createElement('select');
    languageSelect.className = 'dbi-lang-select';
    bindText(languageSelect, 'language_selector_title', 'title');
    languageSelect.addEventListener('change', onLanguageChange);
    languageWrap.appendChild(globe);
    languageWrap.appendChild(languageSelect);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'dbi-close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', closeModal);

    headerActions.appendChild(languageWrap);
    headerActions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(headerActions);

    const body = document.createElement('div');
    body.className = 'dbi-modal-body';

    queryInput = document.createElement('input');
    queryInput.type = 'text';
    queryInput.className = 'dbi-text-input';
    bindText(queryInput, 'query_placeholder', 'placeholder');
    body.appendChild(queryInput);

    const modelRow = document.createElement('div');
    modelRow.className = 'dbi-row';
    const modelLabel = document.createElement('label');
    bindText(modelLabel, 'model_label');
    modelSelect = document.createElement('select');
    modelSelect.className = 'dbi-select';
    modelSelect.addEventListener('change', updateCategoryVisibility);
    modelRow.appendChild(modelLabel);
    modelRow.appendChild(modelSelect);
    body.appendChild(modelRow);

    categoryGroup = document.createElement('div');
    categoryGroup.className = 'dbi-category-group';
    CATEGORIES.forEach(function (cat) {
      const item = createCheckboxRow('category_' + cat);
      categoryCheckboxes[cat] = item.checkbox;
      categoryRows[cat] = item.row;
      categoryGroup.appendChild(item.row);
    });
    body.appendChild(categoryGroup);

    const optionsGroup = document.createElement('div');
    optionsGroup.className = 'dbi-options-group';
    const resItem = createCheckboxRow('apply_resolution');
    resolutionCheckbox = resItem.checkbox;
    optionsGroup.appendChild(resItem.row);
    const sortItem = createCheckboxRow('apply_sort_order');
    sortOrderCheckbox = sortItem.checkbox;
    optionsGroup.appendChild(sortItem.row);
    body.appendChild(optionsGroup);

    const footer = document.createElement('div');
    footer.className = 'dbi-modal-footer';
    footer.appendChild(createActionButton('dbi-btn dbi-btn-primary', 'overwrite', 'overwrite'));
    footer.appendChild(createActionButton('dbi-btn', 'append', 'append'));
    footer.appendChild(createActionButton('dbi-btn', 'prepend', 'prepend'));
    footer.appendChild(createActionButton('dbi-btn dbi-btn-secondary', 'close', null));

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    modalRoot = overlay;
  }

  function resolveSelectedModel() {
    const presets = presetsData.presets || {};
    const keys = Object.keys(presets);
    const saved = configData.selected_model;
    if (saved && presets[saved]) return saved;
    for (let index = 0; index < keys.length; index += 1) {
      if (saved && presets[keys[index]].name === saved) return keys[index];
    }
    if (presetsData.default_model && presets[presetsData.default_model])
      return presetsData.default_model;
    return keys.length ? keys[0] : '';
  }

  function populateModelSelect() {
    modelSelect.innerHTML = '';
    const presets = presetsData.presets || {};
    const groups = {};
    const groupOrder = [];
    Object.keys(presets).forEach(function (key) {
      const category = presets[key].category || '';
      if (!groups[category]) {
        const group = document.createElement('optgroup');
        group.label = category;
        groups[category] = group;
        groupOrder.push(category);
      }
      const option = document.createElement('option');
      option.value = key;
      option.textContent = presets[key].display_name || presets[key].name || key;
      groups[category].appendChild(option);
    });
    groupOrder.forEach(function (category) {
      modelSelect.appendChild(groups[category]);
    });
    const selected = resolveSelectedModel();
    if (selected) modelSelect.value = selected;
  }

  function populateLanguageSelect() {
    languageSelect.innerHTML = '';
    Object.keys(localesData)
      .sort()
      .forEach(function (code) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = localesData[code].language_name || code;
        languageSelect.appendChild(option);
      });
    languageSelect.value = currentLanguage;
  }

  function applyConfigToUI() {
    const categories = configData.categories || {};
    CATEGORIES.forEach(function (cat) {
      categoryCheckboxes[cat].checked = categories[cat] !== false;
    });
    resolutionCheckbox.checked = configData.apply_resolution !== false;
    sortOrderCheckbox.checked = configData.apply_sort_order !== false;
  }

  function collectConfigFromUI() {
    const categories = {};
    CATEGORIES.forEach(function (cat) {
      categories[cat] = categoryCheckboxes[cat].checked;
    });
    return {
      selected_model: modelSelect.value,
      language: userLanguage,
      categories: categories,
      apply_resolution: resolutionCheckbox.checked,
      apply_sort_order: sortOrderCheckbox.checked,
    };
  }

  async function onLanguageChange() {
    userLanguage = languageSelect.value;
    currentLanguage = userLanguage;
    applyLocale();
    configData = collectConfigFromUI();
    try {
      await saveConfig();
    } catch (error) {
      showToast(t('toast_backend_error'), true);
      console.error('Failed to save config:', error);
    }
  }

  async function ensureData() {
    if (!presetsData) await loadPresets();
    if (!configData) await loadConfig();
    if (!Object.keys(localesData).length) {
      try {
        await loadLocales();
      } catch (error) {
        localesData = {};
        console.error('Failed to load locales:', error);
      }
    }
    userLanguage = normalizeSavedLanguage(configData.language);
    currentLanguage = resolveLanguage();
  }

  async function openModal(tab) {
    currentTab = tab;
    try {
      await ensureData();
    } catch (error) {
      showToast(t('toast_backend_error'), true);
      console.error('Failed to ensure data:', error);
      return;
    }
    if (!modalRoot) buildModal();
    populateModelSelect();
    populateLanguageSelect();
    applyConfigToUI();
    updateCategoryVisibility();
    applyLocale();
    modalRoot.style.display = 'flex';
    queryInput.value = '';
    queryInput.focus();
  }

  function closeModal() {
    if (modalRoot) modalRoot.style.display = 'none';
  }

  function getPromptTextarea(tab) {
    return gradioApp().querySelector('#' + tab + '_prompt textarea');
  }

  function setPromptValue(textarea, value) {
    textarea.value = value;
    dispatchInputEvent(textarea);
  }

  function setSliderValue(tab, dimension, value) {
    const container = gradioApp().querySelector('#' + tab + '_' + dimension);
    if (!container) return;
    const numberInput = container.querySelector('input[type=number]');
    if (numberInput) {
      numberInput.value = value;
      dispatchInputEvent(numberInput);
    }
    const rangeInput = container.querySelector('input[type=range]');
    if (rangeInput) {
      rangeInput.value = value;
      dispatchInputEvent(rangeInput);
    }
  }

  function buildTagString(data, categories, applySort, allowedOrder) {
    const order = applySort
      ? allowedOrder
      : DEFAULT_ORDER.filter(function (cat) {
          return allowedOrder.indexOf(cat) !== -1;
        });
    const parts = [];
    order.forEach(function (cat) {
      if (!categories[cat]) return;
      const value = data[cat];
      if (value && value.length > 0) parts.push(value);
    });
    return parts.join(', ');
  }

  function errorMessage(response) {
    const code = response.error_code;
    const key = 'error_' + code;
    if (code && hasTranslation(key)) {
      if (code === 'request_failed' && response.error) {
        return t(key) + ': ' + response.error;
      }
      return t(key);
    }
    return response.error || t('error_unknown');
  }

  async function handleAction(mode) {
    const query = queryInput.value.trim();
    if (!query) {
      showToast(t('toast_empty'), true);
      return;
    }

    const modelKey = modelSelect.value;
    let response;
    try {
      response = await fetchJson('/danbooru_importer/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, model: modelKey }),
      });
    } catch (error) {
      console.error('Failed to fetch Danbooru data:', error);
      showToast(t('toast_backend_error'), true);
      return;
    }

    if (!response.success) {
      showToast(errorMessage(response), true);
      return;
    }

    const allowedOrder = getAllowedCategories(modelKey);
    const categories = {};
    CATEGORIES.forEach(function (cat) {
      categories[cat] = allowedOrder.indexOf(cat) !== -1 && categoryCheckboxes[cat].checked;
    });

    const tagString = buildTagString(
      response.data,
      categories,
      sortOrderCheckbox.checked,
      allowedOrder
    );

    const textarea = getPromptTextarea(currentTab);
    if (!textarea) {
      showToast(t('toast_no_prompt'), true);
      return;
    }

    const currentValue = textarea.value;
    let newValue;
    if (mode === 'overwrite') {
      newValue = tagString;
    } else if (mode === 'append') {
      newValue = currentValue
        ? tagString
          ? currentValue + ', ' + tagString
          : currentValue
        : tagString;
    } else {
      newValue = tagString
        ? currentValue
          ? tagString + ', ' + currentValue
          : tagString
        : currentValue;
    }
    setPromptValue(textarea, newValue);

    if (resolutionCheckbox.checked && response.data.width && response.data.height) {
      setSliderValue(currentTab, 'width', response.data.width);
      setSliderValue(currentTab, 'height', response.data.height);
    }

    configData = collectConfigFromUI();
    try {
      await saveConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast(t('toast_backend_error'), true);
    }

    closeModal();
    queryInput.value = '';
    showToast(t('toast_success'), false);
  }

  function insertGenerateButton(tab) {
    const root = gradioApp();
    const generateButton = root.querySelector('#' + tab + '_generate');
    if (!generateButton) return;
    if (root.querySelector('#' + tab + '_danbooru_importer_btn')) return;

    const container = generateButton.closest('div');
    const anchor = container || generateButton;

    const button = document.createElement('button');
    button.id = tab + '_danbooru_importer_btn';
    button.className = 'dbi-trigger-btn';
    button.textContent = hasTranslation('trigger_button')
      ? t('trigger_button')
      : 'Danbooru Importer';
    bindText(button, 'trigger_button');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(tab);
    });

    anchor.parentElement.insertBefore(button, anchor.nextSibling);
  }

  async function initialize() {
    await Promise.allSettled([loadPresets(), loadConfig(), loadLocales()]);
    if (configData) userLanguage = normalizeSavedLanguage(configData.language);
    currentLanguage = resolveLanguage();
    insertGenerateButton('txt2img');
    insertGenerateButton('img2img');
  }

  onUiLoaded(initialize);
})();
