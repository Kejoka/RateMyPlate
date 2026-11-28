<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    Camera,
    Check,
    ChevronDown,
    ChevronRight,
    CircleUserRound,
    Clock3,
    Filter,
    Flame,
    Heart,
    ImagePlus,
    LayoutDashboard,
    LogOut,
    Menu,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    SlidersHorizontal,
    Sparkles,
    Star,
    Trophy,
    Upload,
    Users,
    Utensils,
    X
  } from 'lucide-svelte';
  import {
    appEnvironment,
    appwriteConfigured,
    circlesConfigured,
    createAppwriteMeal,
    createAppwriteCircle,
    dataConfigured,
    deleteAppwriteCircle,
    deleteAppwriteMeal,
    getCurrentUser,
    listAppwriteCircles,
    listAppwriteCircleMembers,
    listAppwriteMeals,
    listAppwriteNotifications,
    loginWithEmail,
    ensureAppwriteProfile,
    usernameFromIdentity,
    markAppwriteNotificationRead,
    logoutCurrentUser,
    registerWithEmail,
    updateAppwriteCircle,
    updateAppwriteMeal,
    upsertAppwriteRating,
    uploadProfileImage,
    updateProfilePrefs,
    profileImagePreview,
    inviteToAppwriteCircle,
    removeAppwriteCircleMember,
    searchAppwriteProfiles,
    loadAppwriteImagePreview,
    migrateOwnedMealPermissions,
    unassignAppwriteMealsFromGroup
  } from '$lib/appwrite';
  import { compressImageToJpeg } from '$lib/image';
  import MealImage from '$lib/MealImage.svelte';
  import { translate, translateErrorMessage, type Language } from '$lib/i18n';
  import type { AppNotification, Circle, CircleMember, DietaryTag, Meal, NewMeal, Rating, UserProfile } from '$lib/types';
  import { createRecipeId, defaultRecipeCategory, emptyRecipe, formatIngredient, formatStep, parseRecipe } from '$lib/recipe';

  type AppUser = { $id: string; name: string; email: string; prefs?: Record<string, unknown> };

  const seedMeals: Meal[] = [
    {
      id: 'meal-1',
      name: 'Miso butter noodles',
      date: '2026-11-23',
      image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Miso butter noodles with charred broccolini',
      note: 'A very good kind of weeknight dinner. Salty, silky and gone in ten minutes.',
      circle: 'Sunday table',
      addedBy: 'Maya',
      accent: '#287344',
      ratings: [
        { id: 'r-1', name: 'Maya', initials: 'MC', value: 5, color: '#287344', isCurrentUser: true },
        { id: 'r-2', name: 'Jon', initials: 'JR', value: 5, color: '#56a06d' },
        { id: 'r-3', name: 'Sofia', initials: 'SL', value: 4, color: '#85be91' },
        { id: 'r-4', name: 'Leo', initials: 'LW', value: 5, color: '#74a89a' }
      ]
    },
    {
      id: 'meal-2',
      name: 'Roasted tomato toast',
      date: '2026-10-18',
      image: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Slow roasted tomatoes, ricotta, sourdough',
      note: 'The tomatoes were the last of the season and they deserved the good bread.',
      circle: 'Flat 4 dinner club',
      addedBy: 'Sofia',
      accent: '#56a06d',
      ratings: [
        { id: 'r-5', name: 'Maya', initials: 'MC', value: 4, color: '#287344', isCurrentUser: true },
        { id: 'r-6', name: 'Sofia', initials: 'SL', value: 5, color: '#85be91' },
        { id: 'r-7', name: 'Jon', initials: 'JR', value: 4, color: '#56a06d' }
      ]
    },
    {
      id: 'meal-3',
      name: 'Green curry night',
      date: '2026-09-06',
      image: 'https://images.unsplash.com/photo-1455621481073-d5bc1c40e3cb?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Green curry with tofu, green beans and jasmine rice',
      note: 'A little too spicy for the first bite, exactly right by the last.',
      circle: 'Sunday table',
      addedBy: 'Jon',
      accent: '#85be91',
      ratings: [
        { id: 'r-8', name: 'Maya', initials: 'MC', value: 4, color: '#287344', isCurrentUser: true },
        { id: 'r-9', name: 'Jon', initials: 'JR', value: 5, color: '#56a06d' },
        { id: 'r-10', name: 'Sofia', initials: 'SL', value: 4, color: '#85be91' },
        { id: 'r-11', name: 'Leo', initials: 'LW', value: 4, color: '#74a89a' }
      ]
    },
    {
      id: 'meal-4',
      name: 'Peach & burrata',
      date: '2025-08-14',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Peaches, burrata, basil oil and toasted pistachios',
      note: 'The kind of dinner that only needs a sunset and a second glass of something cold.',
      circle: 'Balcony season',
      addedBy: 'Leo',
      accent: '#74a89a',
      ratings: [
        { id: 'r-12', name: 'Maya', initials: 'MC', value: 5, color: '#287344', isCurrentUser: true },
        { id: 'r-13', name: 'Leo', initials: 'LW', value: 5, color: '#74a89a' },
        { id: 'r-14', name: 'Sofia', initials: 'SL', value: 5, color: '#85be91' }
      ]
    },
    {
      id: 'meal-5',
      name: 'Sunday roast chicken',
      date: '2025-03-02',
      image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Roast chicken with lemon, herbs and crispy potatoes',
      note: 'Everyone had an opinion about the potatoes. Everyone asked for more.',
      circle: 'Sunday table',
      addedBy: 'Maya',
      accent: '#56a06d',
      ratings: [
        { id: 'r-15', name: 'Maya', initials: 'MC', value: 4, color: '#287344', isCurrentUser: true },
        { id: 'r-16', name: 'Jon', initials: 'JR', value: 4, color: '#56a06d' },
        { id: 'r-17', name: 'Leo', initials: 'LW', value: 5, color: '#74a89a' }
      ]
    },
    {
      id: 'meal-6',
      name: 'The first shakshuka',
      date: '2024-11-11',
      image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=1200&q=88',
      recipe: 'Tomato and pepper shakshuka with herbs',
      note: 'Our original shared dinner. Still makes an appearance whenever we need cheering up.',
      circle: 'Sunday table',
      addedBy: 'Jon',
      accent: '#2f8051',
      ratings: [
        { id: 'r-18', name: 'Maya', initials: 'MC', value: 5, color: '#287344', isCurrentUser: true },
        { id: 'r-19', name: 'Jon', initials: 'JR', value: 5, color: '#56a06d' },
        { id: 'r-20', name: 'Sofia', initials: 'SL', value: 5, color: '#85be91' },
        { id: 'r-21', name: 'Leo', initials: 'LW', value: 4, color: '#74a89a' }
      ]
    }
  ];

  const demoCircles: Circle[] = [
    { id: 'circle-1', name: 'Sunday table', color: '#287344', mealCount: 4 },
    { id: 'circle-2', name: 'Flat 4 dinner club', color: '#56a06d', mealCount: 1 },
    { id: 'circle-3', name: 'Balcony season', color: '#85be91', mealCount: 1 }
  ];

  let meals = $state<Meal[]>(appwriteConfigured ? [] : seedMeals);
  let circles = $state<Circle[]>(appwriteConfigured ? [] : demoCircles);
  let activeView = $state<'overview' | 'meals' | 'top'>('overview');
  let searchTerm = $state('');
  let selectedMeal = $state<Meal | null>(null);
  let showAddModal = $state(false);
  let editingMeal = $state<Meal | null>(null);
  let showCircleModal = $state(false);
  let editingCircle = $state<Circle | null>(null);
  let circleMembers = $state<CircleMember[]>([]);
  let showFilterMenu = $state(false);
  let showMealMenu = $state(false);
  let showNotificationMenu = $state(false);
  let filterCircle = $state('all');
  let filterYear = $state('all');
  let archiveSort = $state<'date' | 'rating'>('date');
  let savedMealIds = $state<string[]>([]);
  let showMobileNav = $state(false);
  let showMobileSearch = $state(false);
  let searchInput = $state<HTMLInputElement>();
  let showToast = $state(false);
  let toastMessage = $state('');
  let ratingDraft = $state(0);
  let reviewDraft = $state('');
  let imageFile = $state<File | undefined>();
  let imagePreview = $state('');
  let imageProcessing = $state(false);
  let mealBusy = $state(false);
  let imageSelectionId = 0;
  let currentUser = $state<AppUser | null>(null);
  let authReady = $state(!appwriteConfigured);
  let authMode = $state<'login' | 'signup'>('login');
  let authEmail = $state('');
  let authPassword = $state('');
  let authName = $state('');
  let authUsername = $state('');
  let authError = $state('');
  let authBusy = $state(false);
  let dataBusy = $state(false);
  let permissionMigrationUserId = $state('');
  let circleBusy = $state(false);
  let language = $state<Language>('en');
  let recipeCategoryDraft = $state('');
  let recipePortionView = $state(2);
  let recipeUnitSystem = $state<'metric' | 'imperial'>('metric');
  let newMeal = $state<NewMeal>({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    recipe: '',
    recipeData: emptyRecipe(),
    note: '',
    circle: '',
    image: '',
    dietaryTags: []
  });
  let circleForm = $state({ name: '', color: '#48a868' });
  let circleInviteUsername = $state('');
  let circleInviteSuggestions = $state<UserProfile[]>([]);
  let circleInviteSuggestionsOpen = $state(false);
  let circleInviteSearchFailed = $state(false);
  let circleInviteSearchId = 0;
  let userProfile = $state<UserProfile | null>(null);
  let notifications = $state<AppNotification[]>([]);
  let profileImageUrl = $state('');
  let profileImageObjectUrl = '';
  let profileImageLoadId = 0;
  let profileBusy = $state(false);
  let storedLocalCircles = $state<Circle[]>([]);
  let storedLocalRatings = $state<Record<string, Rating>>({});
  let storedLocalMeals = $state<Meal[]>([]);
  let storedDietaryTags = $state<Record<string, DietaryTag[]>>({});
  let deletedCircleNames = $state<string[]>([]);

  const navItems = [
    { id: 'overview' as const, key: 'overview', icon: LayoutDashboard },
    { id: 'meals' as const, key: 'myMeals', icon: Utensils },
    { id: 'top' as const, key: 'topRated', icon: Trophy }
  ];

  const dietaryTagOptions: { value: DietaryTag; key: string }[] = [
    { value: 'vegetarian', key: 'dietaryVegetarian' },
    { value: 'vegan', key: 'dietaryVegan' }
  ];

  function t(key: string, variables: Record<string, string | number> = {}) {
    return translate(language, key, variables);
  }

  function isAllowedDietaryTag(value: unknown): value is DietaryTag {
    return value === 'vegetarian' || value === 'vegan';
  }

  function allowedDietaryTags(tags?: readonly unknown[]) {
    return (tags ?? []).filter(isAllowedDietaryTag);
  }

  const unreadNotifications = $derived(notifications.filter((notification) => !notification.read).length);

  async function hydrateUserExtras() {
    if (!currentUser) {
      userProfile = null;
      notifications = [];
      return;
    }
    try {
      userProfile = await ensureAppwriteProfile(
        currentUser.$id,
        currentUser.name,
        authUsername.trim() || undefined,
        currentUser.email
      );
    } catch (error) {
      userProfile = null;
      console.error('Profile setup failed.', error);
    }
    notifications = await listAppwriteNotifications(currentUser.$id).catch(() => []);
    authUsername = '';
  }

  function canManageMeal(meal: Meal) {
    return !appwriteConfigured || Boolean(currentUser && meal.ownerId === currentUser.$id);
  }

  function openEditMeal(meal: Meal) {
    if (!canManageMeal(meal)) return;
    editingMeal = meal;
    newMeal = {
      name: meal.name,
      date: meal.date,
      recipe: meal.recipe ?? '',
      recipeData: parseRecipe(meal.recipe) ?? { ...emptyRecipe(), source: meal.recipe ?? '' },
      note: meal.note === 'No note added.' || meal.note === 'Keine Notiz hinzugefügt.' ? '' : meal.note,
      circle: meal.circle,
      image: meal.image,
      dietaryTags: allowedDietaryTags(meal.dietaryTags)
    };
    imageFile = undefined;
    imagePreview = meal.image;
    showMealMenu = false;
    showAddModal = true;
  }

  function toggleLanguage() {
    language = language === 'en' ? 'de' : 'en';
    document.documentElement.lang = language;
    localStorage.setItem('table-talk-language', language);
  }

  async function toggleMobileSearch() {
    const shouldOpen = !showMobileSearch;
    showNotificationMenu = false;
    showMobileNav = false;
    showMobileSearch = shouldOpen;
    if (showMobileSearch) {
      await tick();
      searchInput?.focus();
    }
  }

  function openMobileNavigation() {
    showMobileSearch = false;
    showNotificationMenu = false;
    showMobileNav = true;
  }

  function closeNotificationMenuOnOutsidePointer(event: PointerEvent) {
    if (!(event.target instanceof Element)) return;
    if (showNotificationMenu && !event.target.closest('.notification-wrap')) showNotificationMenu = false;
    if (showMobileSearch && !event.target.closest('.search-box, .mobile-search-trigger')) showMobileSearch = false;
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    showNotificationMenu = false;
    showFilterMenu = false;
    showMobileNav = false;
    showMobileSearch = false;
  }

  const groups = $derived.by(() => {
    const filtered = meals
      .filter((meal) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch = !search || meal.name.toLowerCase().includes(search) || meal.circle.toLowerCase().includes(search);
        const matchesCircle = filterCircle === 'all'
          || (filterCircle === '__none__' ? !meal.circle : !meal.circle || meal.circle === filterCircle);
        const matchesYear = filterYear === 'all' || meal.date.startsWith(filterYear);
        const matchesOwner = activeView !== 'meals' || !appwriteConfigured || meal.id.startsWith('local-') || meal.ownerId === currentUser?.$id;
        return matchesSearch && matchesCircle && matchesYear && matchesOwner;
      })
      .sort((a, b) => archiveSort === 'date'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : average(b.ratings) - average(a.ratings) || b.ratings.length - a.ratings.length);
    const result: { key: string; year: string; month: string; meals: Meal[] }[] = [];
    filtered.forEach((meal) => {
      const date = new Date(`${meal.date}T12:00:00`);
      const year = date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { year: 'numeric' });
      const month = date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { month: 'long' });
      const key = `${year}-${month}`;
      const existing = result.find((group) => group.key === key);
      if (existing) existing.meals.push(meal);
      else result.push({ key, year, month, meals: [meal] });
    });
    return result;
  });

  const topMeals = $derived(
    [...meals]
      .sort((a, b) => average(b.ratings) - average(a.ratings) || b.ratings.length - a.ratings.length)
      .slice(0, 5)
  );

  const totalRatings = $derived(meals.reduce((sum, meal) => sum + meal.ratings.length, 0));
  const overallAverage = $derived(
    meals.length ? (meals.reduce((sum, meal) => sum + average(meal.ratings), 0) / meals.length).toFixed(1) : '0.0'
  );
  const latestMeal = $derived(meals[0] ?? null);
  const years = $derived([...new Set(meals.map((meal) => meal.date.slice(0, 4)))].sort().reverse());
  const myMealCount = $derived(
    meals.filter((meal) => !appwriteConfigured || meal.id.startsWith('local-') || meal.ownerId === currentUser?.$id).length
  );

  const displayName = $derived(currentUser?.name || t('tableGuest'));
  const displayInitials = $derived(
    currentUser?.name
      ? currentUser.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'TT'
  );

  function average(ratings: Rating[]) {
    return ratings.length ? ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length : 0;
  }

  function groupLabel(name: string) {
    return name || t('noGroup');
  }

  function starFill(value: number, index: number) {
    if (value >= index + 1) return 'full';
    if (value >= index + 0.5) return 'half';
    return 'empty';
  }

  function formatDate(dateString: string) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function setView(view: 'overview' | 'meals' | 'top') {
    activeView = view;
    showMobileNav = false;
    showMobileSearch = false;
  }

  function selectMeal(meal: Meal) {
    selectedMeal = meal;
    const recipe = parseRecipe(meal.recipe);
    recipePortionView = recipe?.portions ?? 2;
    recipeUnitSystem = 'metric';
    const ownRating = meal.ratings.find((rating) => rating.isCurrentUser || rating.ownerId === currentUser?.$id);
    ratingDraft = ownRating?.value ?? 0;
    reviewDraft = ownRating?.review ?? '';
  }

  function ownRatingFor(meal: Meal) {
    return meal.ratings.find((rating) => rating.isCurrentUser || rating.ownerId === currentUser?.$id)?.value ?? 0;
  }

  async function openCircleModal(circle?: Circle) {
    editingCircle = circle ?? null;
    circleMembers = [];
    circleForm = circle ? { name: circle.name, color: circle.color } : { name: '', color: '#48a868' };
    circleInviteUsername = '';
    circleInviteSuggestions = [];
    circleInviteSuggestionsOpen = false;
    circleInviteSearchFailed = false;
    showCircleModal = true;
    if (circle && circlesConfigured && !circle.id.startsWith('local-') && !circle.id.startsWith('derived-')) {
      try {
        circleMembers = await listAppwriteCircleMembers(circle.id);
      } catch (error) {
        toast(errorMessage(error, t('membersLoadFailed')));
      }
    }
  }

  async function removeCircleMember(member: CircleMember) {
    if (!editingCircle || !member.id || !currentUser || member.isAdmin) return;
    circleBusy = true;
    try {
      await removeAppwriteCircleMember(editingCircle.id, member.id, currentUser.$id);
      circleMembers = circleMembers.filter((item) => item.id !== member.id);
      toast(t('memberRemoved'));
      await hydrateMeals();
    } catch (error) {
      toast(errorMessage(error, t('memberRemoveFailed')));
    } finally {
      circleBusy = false;
    }
  }

  async function searchCircleInviteUsers(value: string) {
    const searchId = ++circleInviteSearchId;
    const query = value.trim().replace(/^@+/, '');
    if (query.length < 1 || !circlesConfigured) {
      circleInviteSuggestions = [];
      circleInviteSuggestionsOpen = false;
      circleInviteSearchFailed = false;
      return;
    }
    circleInviteSuggestionsOpen = true;
    circleInviteSearchFailed = false;
    try {
      const matches = await searchAppwriteProfiles(query);
      if (searchId !== circleInviteSearchId) return;
      circleInviteSuggestions = matches.filter((profile) => profile.userId !== currentUser?.$id);
    } catch {
      if (searchId === circleInviteSearchId) {
        circleInviteSuggestions = [];
        circleInviteSearchFailed = true;
      }
    }
  }

  function selectCircleInviteUser(profile: UserProfile) {
    circleInviteUsername = profile.username;
    circleInviteSuggestions = [];
    circleInviteSuggestionsOpen = false;
  }

  function circleMealCount(circleName: string) {
    return meals.filter((meal) => meal.circle === circleName).length;
  }

  function errorMessage(error: unknown, fallback: string) {
    const message = error instanceof Error ? translateErrorMessage(language, error.message) : null;
    return message || fallback || t('unexpectedError');
  }

  function recipeCategoryLabel(category: string) {
    return category.trim().toLowerCase() === defaultRecipeCategory ? t('otherCategory') : category;
  }

  function mealNote(note: string) {
    return !note || note === 'No note added.' || note === 'Keine Notiz hinzugefügt.'
      ? t('newMemoryNote')
      : note;
  }

  async function setProfileImage(imageId?: string) {
    const loadId = ++profileImageLoadId;
    if (profileImageObjectUrl) {
      URL.revokeObjectURL(profileImageObjectUrl);
      profileImageObjectUrl = '';
    }
    const source = imageId ? profileImagePreview(imageId) : '';
    profileImageUrl = source.startsWith('private-appwrite-file:') ? '' : source;
    if (!source) return;
    const loaded = await loadAppwriteImagePreview(source);
    if (loadId !== profileImageLoadId) {
      if (loaded) URL.revokeObjectURL(loaded);
      return;
    }
    if (loaded) {
      profileImageObjectUrl = loaded;
      profileImageUrl = loaded;
    }
  }

  function persistDeletedCircleNames() {
    localStorage.setItem('table-talk-deleted-circles', JSON.stringify(deletedCircleNames));
  }

  async function hydrateMeals() {
    if (!dataConfigured) {
      meals = storedLocalMeals.filter((meal) => !currentUser || meal.ownerId === currentUser.$id);
      selectedMeal = meals[0] ?? null;
      ratingDraft = selectedMeal ? ownRatingFor(selectedMeal) : 0;
      reviewDraft = selectedMeal?.ratings.find((rating) => rating.isCurrentUser || rating.ownerId === currentUser?.$id)?.review ?? '';
      return;
    }

    dataBusy = true;
    let liveCircles: Circle[] = [];
    let liveMeals: Meal[] = [];
    let loadError: unknown = null;
    let circlesLoadSucceeded = false;
    try {
      liveCircles = currentUser ? await listAppwriteCircles(currentUser.$id) : [];
      circlesLoadSucceeded = true;
    } catch (error) {
      loadError = error;
    }
    try {
      liveMeals = currentUser
        ? await listAppwriteMeals(currentUser.$id, liveCircles.map((circle) => circle.name))
        : [];
    } catch (error) {
      loadError = loadError ?? error;
    }

    const visibleMeals = [
      ...liveMeals,
      ...storedLocalMeals.filter((meal) => meal.ownerId === currentUser?.$id)
    ].filter((meal, index, list) => list.findIndex((candidate) => candidate.id === meal.id) === index);
    meals = visibleMeals.map((meal) => ({
      ...meal,
      dietaryTags: allowedDietaryTags(storedDietaryTags[meal.id] ?? meal.dietaryTags),
      ratings: [
        ...meal.ratings
          .filter((rating) => rating.ownerId !== currentUser?.$id)
          .map((rating) => ({
            ...rating,
            isCurrentUser: rating.ownerId === currentUser?.$id
          })),
        ...(storedLocalRatings[meal.id]
          ? [{ ...storedLocalRatings[meal.id], isCurrentUser: true }]
          : meal.ratings
              .filter((rating) => rating.ownerId === currentUser?.$id)
              .map((rating) => ({ ...rating, isCurrentUser: true })))
      ]
    }));

    // A deleted group must not come back as a derived group from an old meal
    // row. When the group list loaded successfully, clear orphaned group
    // assignments on meals owned by the current user while preserving the meal.
    if (circlesLoadSucceeded && currentUser) {
      const ownerId = currentUser.$id;
      const knownGroupNames = new Set(liveCircles.map((circle) => circle.name));
      const orphaned = meals.filter((meal) =>
        meal.ownerId === ownerId && meal.circle && !knownGroupNames.has(meal.circle) && !meal.id.startsWith('local-')
      );
      if (orphaned.length) {
        await Promise.all(orphaned.map((meal) =>
          updateAppwriteMeal(meal.id, ownerId, { circle: '' })
            .catch(() => null)
        ));
        meals = meals.map((meal) => orphaned.some((item) => item.id === meal.id) ? { ...meal, circle: '' } : meal);
      }
    }
    selectedMeal = meals[0] ?? null;
    ratingDraft = selectedMeal ? ownRatingFor(selectedMeal) : 0;
    reviewDraft = selectedMeal?.ratings.find((rating) => rating.isCurrentUser || rating.ownerId === currentUser?.$id)?.review ?? '';
    await hydrateCircles(liveCircles);
    if (loadError && meals.length === 0 && circles.length === 0) {
      toast(`${t('couldNotLoad')}: ${errorMessage(loadError, '')}`);
    }
    dataBusy = false;
  }

  async function loadUserMeals() {
    if (!currentUser) return;
    if (permissionMigrationUserId !== currentUser.$id) {
      try {
        await migrateOwnedMealPermissions(currentUser.$id);
        permissionMigrationUserId = currentUser.$id;
      } catch (error) {
        toast(`${t('mealPermissionMigrationFailed')}: ${errorMessage(error, '')}`);
      }
    }
    await hydrateMeals();
  }

  async function hydrateCircles(liveCircles?: Circle[]) {
    if (!circlesConfigured || !currentUser) {
      const derived = meals.length
        ? [...new Set(meals.map((meal) => meal.circle))].filter(Boolean).map((name, index) => ({
            id: `derived-${index}`,
            name,
            color: ['#db8a59', '#90a98c', '#e7bc67', '#8ca6a8'][index % 4],
            mealCount: circleMealCount(name)
          }))
        : [];
      const deleted = new Set(deletedCircleNames);
      const names = new Set(derived.map((circle) => circle.name));
      circles = [
        ...storedLocalCircles.filter((circle) => !deleted.has(circle.name) && !names.has(circle.name)).map((circle) => ({
          ...circle,
          mealCount: circleMealCount(circle.name)
        })),
        ...derived.filter((circle) => !deleted.has(circle.name))
      ];
      newMeal.circle = circles.some((circle) => circle.name === newMeal.circle) ? newMeal.circle : '';
      return;
    }
    const userId = currentUser.$id;
    try {
      const availableCircles = liveCircles ?? await listAppwriteCircles(userId);
      const deleted = new Set(deletedCircleNames);
      const names = new Set(availableCircles.map((circle) => circle.name));
      const local = storedLocalCircles
        .filter((circle) =>
          circle.id.startsWith('local-circle-')
          && !deleted.has(circle.name)
          && !names.has(circle.name)
          && (!circle.ownerId || circle.ownerId === userId)
        )
        .map((circle) => ({ ...circle, mealCount: circleMealCount(circle.name) }));
      circles = [...availableCircles.filter((circle) => !deleted.has(circle.name)), ...local]
        .map((circle) => ({ ...circle, mealCount: circleMealCount(circle.name) }));
      newMeal.circle = circles.some((circle) => circle.name === newMeal.circle) ? newMeal.circle : '';
    } catch {
      circles = [];
      newMeal.circle = '';
    }
  }

  async function submitAuth() {
    authError = '';
    authBusy = true;
    try {
      const session =
        authMode === 'signup'
          ? await registerWithEmail(authEmail.trim(), authPassword, authName.trim())
          : await loginWithEmail(authEmail.trim(), authPassword);
      currentUser = session ? await getCurrentUser() : null;
      await setProfileImage(typeof currentUser?.prefs?.profileImageId === 'string'
        ? currentUser.prefs.profileImageId
        : undefined);
      if (!currentUser) throw new Error(t('sessionStartFailed'));
      await hydrateUserExtras();
      await loadUserMeals();
    } catch (error) {
      authError = errorMessage(error, t('authFailed'));
    } finally {
      authBusy = false;
    }
  }

  async function signOut() {
    try {
      await logoutCurrentUser();
    } finally {
      currentUser = null;
      await setProfileImage();
      permissionMigrationUserId = '';
      meals = appwriteConfigured ? [] : seedMeals;
      circles = appwriteConfigured ? [] : demoCircles;
      selectedMeal = null;
      ratingDraft = 0;
      reviewDraft = '';
      userProfile = null;
      notifications = [];
      activeView = 'overview';
    }
  }

  onMount(async () => {
    const storedLanguage = localStorage.getItem('table-talk-language');
    language = storedLanguage === 'de' || storedLanguage === 'en'
      ? storedLanguage
      : navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
    document.documentElement.lang = language;
    savedMealIds = JSON.parse(localStorage.getItem('table-talk-saved') ?? '[]');
    await setProfileImage(typeof currentUser?.prefs?.profileImageId === 'string'
      ? currentUser.prefs.profileImageId
      : undefined);
    storedLocalCircles = JSON.parse(localStorage.getItem('table-talk-circles') ?? '[]');
    storedLocalRatings = JSON.parse(localStorage.getItem('table-talk-ratings') ?? '{}');
    storedLocalMeals = JSON.parse(localStorage.getItem('table-talk-meals') ?? '[]');
    storedDietaryTags = JSON.parse(localStorage.getItem('table-talk-dietary-tags') ?? '{}');
    deletedCircleNames = JSON.parse(localStorage.getItem('table-talk-deleted-circles') ?? '[]');
    if (!circlesConfigured) circles = [...storedLocalCircles, ...(!appwriteConfigured ? demoCircles : [])];
    if (!appwriteConfigured) {
      meals = [...storedLocalMeals, ...seedMeals].map((meal) => storedLocalRatings[meal.id]
        ? {
            ...meal,
            dietaryTags: allowedDietaryTags(storedDietaryTags[meal.id] ?? meal.dietaryTags),
            ratings: [
              ...meal.ratings.filter((rating) => !rating.isCurrentUser),
              { ...storedLocalRatings[meal.id], isCurrentUser: true }
            ]
          }
        : { ...meal, dietaryTags: allowedDietaryTags(storedDietaryTags[meal.id] ?? meal.dietaryTags) });
      newMeal.circle = circles[0]?.name ?? '';
      return;
    }
    currentUser = await getCurrentUser();
    await setProfileImage(typeof currentUser?.prefs?.profileImageId === 'string'
      ? currentUser.prefs.profileImageId
      : undefined);
    authReady = true;
    if (currentUser) {
      await hydrateUserExtras();
      await loadUserMeals();
    }
  });

  async function handleProfileImage(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !currentUser) return;
    profileBusy = true;
    try {
      const uploaded = await uploadProfileImage(file, currentUser.$id);
      if (uploaded) {
        await updateProfilePrefs({ ...(currentUser.prefs ?? {}), profileImageId: uploaded.$id });
        await setProfileImage(uploaded.$id);
        toast(t('profileUpdated'));
      }
    } catch (error) {
      toast(errorMessage(error, t('profileUpdateFailed')));
    } finally {
      profileBusy = false;
    }
  }

  function resetForm() {
    newMeal = {
      name: '',
      date: new Date().toISOString().slice(0, 10),
      recipe: '',
      recipeData: emptyRecipe(),
      note: '',
      circle: circles[0]?.name ?? '',
      image: '',
      dietaryTags: []
    };
    imageSelectionId += 1;
    imageFile = undefined;
    imagePreview = '';
    imageProcessing = false;
    recipeCategoryDraft = '';
  }

  function addRecipeCategory() {
    const name = recipeCategoryDraft.trim();
    if (!name || newMeal.recipeData.categories.some((category) => category.toLowerCase() === name.toLowerCase())) return;
    newMeal.recipeData.categories = [...newMeal.recipeData.categories, name];
    recipeCategoryDraft = '';
  }

  function addRecipeIngredient() {
    const category = newMeal.recipeData.categories[0] || defaultRecipeCategory;
    newMeal.recipeData.ingredients = [...newMeal.recipeData.ingredients, { id: createRecipeId(), name: '', amount: 1, unit: 'g', category }];
  }

  function addRecipeStep() {
    newMeal.recipeData.steps = [...newMeal.recipeData.steps, { id: createRecipeId(), instructions: '' }];
  }

  function removeRecipeIngredient(ingredientId: string) {
    const token = `{{${ingredientId}}}`;
    newMeal.recipeData.ingredients = newMeal.recipeData.ingredients.filter((item) => item.id !== ingredientId);
    newMeal.recipeData.steps = newMeal.recipeData.steps.map((step) => ({ ...step, instructions: step.instructions.replaceAll(token, '').replace(/\s{2,}/g, ' ') }));
  }

  function linkIngredientInStep(stepId: string, ingredientId: string) {
    const token = `{{${ingredientId}}}`;
    newMeal.recipeData.steps = newMeal.recipeData.steps.map((step) => step.id === stepId ? { ...step, instructions: `${step.instructions}${step.instructions && !step.instructions.endsWith(' ') ? ' ' : ''}${token}` } : step);
  }

  function openAddModal() {
    editingMeal = null;
    resetForm();
    showAddModal = true;
  }

  function toggleDietaryTag(tag: DietaryTag) {
    newMeal.dietaryTags = newMeal.dietaryTags.includes(tag)
      ? newMeal.dietaryTags.filter((item) => item !== tag)
      : [...newMeal.dietaryTags, tag];
  }

  async function handleImageUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const selectionId = ++imageSelectionId;
    imageProcessing = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (selectionId === imageSelectionId) imagePreview = String(reader.result);
    };
    reader.readAsDataURL(file);
    try {
      const compressed = await compressImageToJpeg(file);
      if (selectionId === imageSelectionId) imageFile = compressed;
    } catch {
      // Keep the meal usable for browsers that cannot decode a particular
      // image format; supported images still use the optimized JPEG path.
      if (selectionId === imageSelectionId) imageFile = file;
    } finally {
      if (selectionId === imageSelectionId) imageProcessing = false;
    }
  }

  async function saveMeal() {
    if (mealBusy || imageProcessing || !newMeal.name.trim()) return;
    if (editingMeal && !canManageMeal(editingMeal)) {
      toast(t('cannotEditMeal'));
      return;
    }
    mealBusy = true;
    const recipeValue = newMeal.recipeData.ingredients.length || newMeal.recipeData.steps.some((step) => step.instructions.trim()) || newMeal.recipeData.source?.trim()
      ? JSON.stringify({ ...newMeal.recipeData, portions: Math.max(1, Number(newMeal.recipeData.portions) || 1), ingredients: newMeal.recipeData.ingredients.filter((ingredient) => ingredient.name.trim()), steps: newMeal.recipeData.steps.filter((step) => step.instructions.trim()) })
      : newMeal.recipe.trim();

    try {
      if (editingMeal) {
      const updated: Meal = {
        ...editingMeal,
        name: newMeal.name.trim(),
        date: newMeal.date,
        recipe: recipeValue,
        note: newMeal.note.trim(),
        circle: newMeal.circle,
        dietaryTags: [...newMeal.dietaryTags],
        image: imagePreview || editingMeal.image
      };
      try {
        if (dataConfigured && currentUser && !editingMeal.id.startsWith('local-')) {
          const groupTeamId = circles.find((circle) => circle.name === updated.circle && !circle.id.startsWith('derived-') && !circle.id.startsWith('local-'))?.id;
          await updateAppwriteMeal(editingMeal.id, currentUser.$id, {
            name: updated.name,
            date: updated.date,
            recipe: updated.recipe,
            note: updated.note,
            circle: updated.circle,
            dietaryTags: updated.dietaryTags
          }, imageFile, groupTeamId);
        }
        meals = meals.map((meal) => meal.id === updated.id ? updated : meal);
        selectedMeal = updated;
        storedLocalMeals = storedLocalMeals.map((meal) => meal.id === updated.id ? updated : meal);
        localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
        storedDietaryTags = { ...storedDietaryTags, [updated.id]: updated.dietaryTags ?? [] };
        localStorage.setItem('table-talk-dietary-tags', JSON.stringify(storedDietaryTags));
        showAddModal = false;
        editingMeal = null;
        toast(t('mealUpdated'));
      } catch (error) {
        toast(`${t('cannotEditMeal')}: ${errorMessage(error, '')}`);
      }
      return;
    }

      let meal: Meal = {
      id: `local-${Date.now()}`,
      name: newMeal.name.trim(),
      date: newMeal.date,
      image:
        imagePreview ||
        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88',
      recipe: recipeValue,
      note: newMeal.note.trim(),
      circle: newMeal.circle,
      addedBy: displayName,
      accent: '#287344',
      ownerId: currentUser?.$id,
      dietaryTags: [...newMeal.dietaryTags],
      ratings: []
    };
      if (dataConfigured && currentUser) {
      let created: Awaited<ReturnType<typeof createAppwriteMeal>>;
      try {
        const groupTeamId = circles.find((circle) => circle.name === meal.circle && !circle.id.startsWith('derived-') && !circle.id.startsWith('local-'))?.id;
        created = await createAppwriteMeal(meal, currentUser.$id, imageFile, groupTeamId);
        if (!created) throw new Error(t('couldNotLoad'));
      } catch (error) {
        const localMeal = { ...meal, id: `local-${Date.now()}` };
        storedLocalMeals = [localMeal, ...storedLocalMeals];
        localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
        meals = [localMeal, ...meals];
        selectedMeal = localMeal;
        showAddModal = false;
        activeView = 'meals';
        toast(`${t('savedLocally')}: ${errorMessage(error, '')}`);
        return;
      }
      meal = { ...meal, id: created.$id };
      storedDietaryTags = { ...storedDietaryTags, [meal.id]: meal.dietaryTags ?? [] };
      localStorage.setItem('table-talk-dietary-tags', JSON.stringify(storedDietaryTags));
      await hydrateMeals();
      } else {
        storedLocalMeals = [meal, ...storedLocalMeals];
        localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
      }
      meals = [meal, ...meals.filter((existing) => existing.id !== meal.id)];
      selectedMeal = meal;
      showAddModal = false;
      activeView = 'meals';
      toast(t('mealAdded'));
    } finally {
      mealBusy = false;
    }
  }

  async function saveCircle() {
    const name = circleForm.name.trim();
    if (!name) return;
    circleBusy = true;
    let inviteSent = false;
    try {
      if (editingCircle) {
        const previousName = editingCircle.name;
        const updated = { ...editingCircle, name, color: circleForm.color };
        circles = circles.map((circle) => circle.id === editingCircle?.id ? updated : circle);
        meals = meals.map((meal) => meal.circle === previousName ? { ...meal, circle: name } : meal);
        storedLocalMeals = storedLocalMeals.map((meal) => meal.circle === previousName ? { ...meal, circle: name } : meal);
        localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
        storedLocalCircles = storedLocalCircles.map((circle) =>
          circle.id === editingCircle?.id ? updated : circle
        );
        localStorage.setItem('table-talk-circles', JSON.stringify(storedLocalCircles));
        const ownerId = currentUser?.$id;
        if (circlesConfigured && ownerId && !editingCircle.id.startsWith('derived-')) {
          const groupTeamId = editingCircle.id;
          await updateAppwriteCircle(editingCircle.id, ownerId, { name, color: circleForm.color });
          if (circleInviteUsername.trim()) {
            await inviteToAppwriteCircle(editingCircle.id, circleInviteUsername, ownerId, displayName);
            inviteSent = true;
          }
          await Promise.all(
            meals.filter((meal) => meal.circle === name && meal.ownerId === ownerId && !meal.id.startsWith('local-'))
              .map((meal) => updateAppwriteMeal(meal.id, ownerId, { circle: name }, undefined, groupTeamId))
          );
        }
        if (newMeal.circle === previousName) newMeal.circle = name;
        toast(inviteSent ? t('inviteSent') : t('circleUpdated'));
      } else {
        const optimistic: Circle = { id: `local-circle-${Date.now()}`, name, color: circleForm.color, mealCount: 0, ownerId: currentUser?.$id };
        circles = [...circles, optimistic];
        storedLocalCircles = [...storedLocalCircles, optimistic];
        localStorage.setItem('table-talk-circles', JSON.stringify(storedLocalCircles));
        deletedCircleNames = deletedCircleNames.filter((deletedName) => deletedName !== name);
        persistDeletedCircleNames();
        newMeal.circle = newMeal.circle || name;
        if (circlesConfigured && currentUser) {
          const created = await createAppwriteCircle({ name, color: circleForm.color }, currentUser.$id);
          if (created) {
            circles = circles.map((circle) => circle.id === optimistic.id ? { ...optimistic, id: created.$id } : circle);
            storedLocalCircles = storedLocalCircles.map((circle) =>
              circle.id === optimistic.id ? { ...optimistic, id: created.$id } : circle
            );
            localStorage.setItem('table-talk-circles', JSON.stringify(storedLocalCircles));
            if (circleInviteUsername.trim()) {
              await inviteToAppwriteCircle(created.$id, circleInviteUsername, currentUser.$id, displayName);
              inviteSent = true;
            }
          }
        }
        toast(inviteSent ? t('inviteSent') : t('circleCreated'));
      }
      showCircleModal = false;
    } catch (error) {
      // The local optimistic record is still useful when Appwrite permissions
      // have not been configured yet. Close the modal and keep that record so
      // group creation/editing never leaves the UI stuck in a pending state.
      showCircleModal = false;
      editingCircle = null;
      toast(errorMessage(error, t('cannotDeleteCircle')));
    } finally {
      circleBusy = false;
    }
  }

  async function removeCircle(circle: Circle) {
    if (appwriteConfigured && circle.ownerId !== currentUser?.$id) {
      toast(t('cannotDeleteCircle'));
      return;
    }
    if (!confirm(t('confirmDeleteCircle', { name: circle.name }))) return;
    circleBusy = true;
    const affected = meals.filter((meal) => meal.circle === circle.name);
    let cleanupError: unknown = null;
    try {
      const ownerId = currentUser?.$id;
      if (circlesConfigured && ownerId && !circle.id.startsWith('derived-') && !circle.id.startsWith('local-')) {
        await unassignAppwriteMealsFromGroup(circle.name, ownerId);
        const deletion = await deleteAppwriteCircle(circle.id, ownerId);
        cleanupError = deletion?.cleanupError ?? null;
      }
      meals = meals.map((meal) => meal.circle === circle.name ? { ...meal, circle: '' } : meal);
      if (selectedMeal?.circle === circle.name) selectedMeal = { ...selectedMeal, circle: '' };
      storedLocalMeals = storedLocalMeals.map((meal) => meal.circle === circle.name ? { ...meal, circle: '' } : meal);
      localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
      deletedCircleNames = [...new Set([...deletedCircleNames, circle.name])];
      persistDeletedCircleNames();
      circles = circles.filter((item) => item.id !== circle.id);
      storedLocalCircles = storedLocalCircles.filter((item) => item.id !== circle.id && item.name !== circle.name);
      localStorage.setItem('table-talk-circles', JSON.stringify(storedLocalCircles));
      if (filterCircle === circle.name) filterCircle = 'all';
      if (newMeal.circle === circle.name) newMeal.circle = '';
      showCircleModal = false;
      editingCircle = null;
      toast(cleanupError
        ? `${t('groupCleanupFailed')}: ${errorMessage(cleanupError, '')}`
        : t('circleDeleted'));
    } catch (error) {
      toast(errorMessage(error, t('cannotDeleteCircle')));
      await hydrateMeals();
    } finally {
      circleBusy = false;
    }
  }

  function toggleSavedMeal(meal: Meal) {
    savedMealIds = savedMealIds.includes(meal.id)
      ? savedMealIds.filter((id) => id !== meal.id)
      : [...savedMealIds, meal.id];
    localStorage.setItem('table-talk-saved', JSON.stringify(savedMealIds));
    toast(savedMealIds.includes(meal.id) ? t('mealSaved') : t('mealNote'));
  }

  async function removeMeal() {
    if (!selectedMeal || !canManageMeal(selectedMeal)) {
      toast(t('cannotDeleteMeal'));
      return;
    }
    if (!confirm(t('confirmDeleteMeal'))) return;
    const removed = selectedMeal;
    try {
      if (dataConfigured && currentUser) {
        if (!removed.id.startsWith('local-')) {
          if (!currentUser) throw new Error(t('cannotDeleteMeal'));
          const deleted = await deleteAppwriteMeal(removed.id, currentUser.$id);
          if (!deleted) throw new Error(t('couldNotLoad'));
        }
      }
      meals = meals.filter((meal) => meal.id !== removed.id);
      storedLocalMeals = storedLocalMeals.filter((meal) => meal.id !== removed.id);
      localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
      storedLocalRatings = Object.fromEntries(
        Object.entries(storedLocalRatings).filter(([mealId]) => mealId !== removed.id)
      );
      localStorage.setItem('table-talk-ratings', JSON.stringify(storedLocalRatings));
      savedMealIds = savedMealIds.filter((id) => id !== removed.id);
      localStorage.setItem('table-talk-saved', JSON.stringify(savedMealIds));
      selectedMeal = null;
      toast(t('mealDeleted'));
    } catch (error) {
      toast(errorMessage(error, t('cannotDeleteCircle')));
    }
  }

  async function saveRating() {
    if (!selectedMeal || ratingDraft === 0) return;
    const updatedRatings = selectedMeal.ratings.filter((rating) => !rating.isCurrentUser);
    const rating: Rating = {
      id: `rating-${Date.now()}`,
      name: displayName,
      initials: displayInitials,
      value: ratingDraft,
      review: reviewDraft.trim(),
      color: '#287344',
      isCurrentUser: true,
      ownerId: currentUser?.$id
    };
    const updatedMeal = { ...selectedMeal, ratings: [...updatedRatings, rating] };
    meals = meals.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal));
    selectedMeal = updatedMeal;
    storedLocalRatings = { ...storedLocalRatings, [updatedMeal.id]: rating };
    localStorage.setItem('table-talk-ratings', JSON.stringify(storedLocalRatings));
    storedLocalMeals = storedLocalMeals.map((meal) => meal.id === updatedMeal.id ? updatedMeal : meal);
    localStorage.setItem('table-talk-meals', JSON.stringify(storedLocalMeals));
    toast(t('ratingSaved'));
    if (dataConfigured && currentUser) {
      try {
        const groupTeamId = circles.find((circle) => circle.name === updatedMeal.circle && !circle.id.startsWith('derived-') && !circle.id.startsWith('local-'))?.id;
        await upsertAppwriteRating(updatedMeal.id, rating, currentUser.$id, groupTeamId);
      } catch (error) {
        toast(`${t('ratingSavedLocally')}: ${errorMessage(error, '')}`);
      }
    }
  }

  async function markAllNotificationsRead() {
    if (currentUser) {
      await Promise.all(notifications.filter((notification) => !notification.read).map((notification) =>
        markAppwriteNotificationRead(notification.id, currentUser!.$id).catch(() => null)
      ));
    }
    notifications = notifications.map((notification) => ({ ...notification, read: true }));
  }

  function toast(message: string) {
    toastMessage = message;
    showToast = true;
    window.setTimeout(() => (showToast = false), 2800);
  }
</script>

<svelte:window onpointerdown={closeNotificationMenuOnOutsidePointer} onkeydown={handleGlobalKeydown} />

<svelte:head>
  <title>{t('pageTitle')}</title>
      <meta name="description" content={t('appDescription')} />
</svelte:head>

{#if appwriteConfigured && !authReady}
  <div class="auth-shell auth-loading"><div class="auth-card"><div class="brand-mark"><Utensils size={19} strokeWidth={2.2} /></div><h1>{t('openingTable')}</h1><p>{t('checkingSession')}</p></div></div>
{:else if appwriteConfigured && !currentUser}
  <div class="auth-shell">
    <div class="auth-card auth-card-wide">
      <div class="auth-visual">
        <div class="brand-row"><div class="brand-mark"><Utensils size={19} strokeWidth={2.2} /></div><div><div class="brand-name">RateMyPlate</div><div class="brand-subtitle">{t('brandSubtitle')}</div></div></div>
        <div class="auth-visual-copy"><span class="eyebrow"><Sparkles size={14} /> {t('placeForGoodStuff')}</span><h1>{t('keepGoodStuff')}<br /><em>{t('onTheTable')}</em></h1><p>{t('authVisualCopy')}</p></div>
        <div class="auth-visual-note"><span>✦</span> {t('privateToTable')}</div>
      </div>
      <div class="auth-form-panel">
        <div class="auth-form-heading"><span class="eyebrow muted">{t('welcomeBack')}</span><h2>{authMode === 'login' ? t('comeOnIn') : t('setYourTable')}</h2><p>{authMode === 'login' ? t('authLoginCopy') : t('authSignupCopy')}</p></div>
        <form class="auth-form" onsubmit={(event) => { event.preventDefault(); submitAuth(); }}>
          {#if authMode === 'signup'}<label class="field"><span>{t('yourName')} <i>*</i></span><input required autocomplete="name" placeholder={t('namePlaceholder')} bind:value={authName} /></label>{/if}
          {#if authMode === 'signup'}<label class="field"><span>{t('username')} <i>*</i></span><input required minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" autocomplete="username" placeholder={t('usernamePlaceholder')} bind:value={authUsername} /></label>{/if}
          <label class="field"><span>{t('email')} <i>*</i></span><input required type="email" autocomplete="email" placeholder={t('emailPlaceholder')} bind:value={authEmail} /></label>
          <label class="field"><span>{t('password')} <i>*</i></span><input required type="password" minlength="8" autocomplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder={t('passwordPlaceholder')} bind:value={authPassword} /></label>
          {#if authError}<div class="auth-error" role="alert">{authError}</div>{/if}
          <button class="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? t('opening') : authMode === 'login' ? t('signIn') : t('createAccount')}<ArrowUpRight size={16} /></button>
        </form>
        <button class="auth-switch" onclick={() => { authMode = authMode === 'login' ? 'signup' : 'login'; authError = ''; }}>{authMode === 'login' ? t('newToTableTalk') : t('alreadyAccount')}</button>
      </div>
    </div>
  </div>
{:else}
<div class="app-shell">
  <aside class:mobile-open={showMobileNav} class="sidebar">
    <div class="brand-row">
      <div class="brand-mark"><Utensils size={19} strokeWidth={2.2} /></div>
      <div>
        <div class="brand-name">RateMyPlate</div>
        <div class="brand-subtitle">{t('brandSubtitle')}</div>
      </div>
      <button class="sidebar-close mobile-only" aria-label={t('closeMenu')} onclick={() => (showMobileNav = false)}><X size={20} /></button>
    </div>

    <div class="profile-card">
      <label class="profile-avatar" aria-label={t('changeProfilePhoto')}>
        {#if profileImageUrl}<img src={profileImageUrl} alt="" />{:else}{displayInitials}{/if}
        <input type="file" accept="image/*" onchange={handleProfileImage} disabled={profileBusy} />
      </label>
      <div class="profile-copy"><strong>{displayName}</strong><span>@{userProfile?.username ?? usernameFromIdentity(displayName, currentUser?.email ?? '', currentUser?.$id ?? 'user')}</span></div>
    </div>

    <div class="nav-label">{t('yourKitchen')}</div>
    <nav class="main-nav" aria-label={t('mainNavigation')}>
      {#each navItems as item}
        {@const NavIcon = item.icon}
        <button class:active={activeView === item.id} class="nav-item" onclick={() => setView(item.id)}>
          <NavIcon size={18} strokeWidth={1.9} />
          <span>{t(item.key)}</span>
          {#if item.id === 'meals'}<span class="nav-count">{myMealCount}</span>{/if}
        </button>
      {/each}
    </nav>

    <div class="nav-label circles-label">{t('circles')}</div>
    <div class="circle-list">
      {#each circles as circle}
        <div class="circle-row">
          <button class:active={filterCircle === circle.name} class="circle-item" onclick={() => { filterCircle = circle.name; activeView = 'meals'; }}><span class="circle-dot" style={`background: ${circle.color}`}></span>{circle.name} <span class="circle-count">{circleMealCount(circle.name)}</span></button>
          <button class="circle-manage" aria-label={`${t('manageCircle')}: ${circle.name}`} onclick={() => openCircleModal(circle)}><Settings size={13} /></button>
        </div>
      {/each}
      <button class="add-circle" onclick={() => openCircleModal()}><Plus size={14} /> {t('newCircle')}</button>
    </div>

    <div class="sidebar-bottom">
      <div class:connected={appwriteConfigured} class="sync-status">
        <span class="status-pulse"></span>
        {appwriteConfigured
          ? dataConfigured
            ? t('appwriteConnected', { environment: appEnvironment === 'production' ? t('environmentProduction') : t('environmentDevelopment') })
            : t('finishAppwrite')
          : t('localPreview')}
      </div>
      <button class="language-toggle" aria-label={t(language === 'en' ? 'switchToGerman' : 'switchToEnglish')} onclick={toggleLanguage}><span>{t('language')}</span><strong>{language === 'en' ? 'DE' : 'EN'}</strong></button>
      {#if currentUser}<button class="nav-item settings" onclick={signOut}><LogOut size={18} strokeWidth={1.9} /><span>{t('signOut')}</span></button>{:else}<button class="nav-item settings"><Settings size={18} strokeWidth={1.9} /><span>{t('settings')}</span></button>{/if}
    </div>
  </aside>

  {#if showMobileNav}<button class="mobile-nav-scrim" aria-label={t('closeMenu')} onclick={() => (showMobileNav = false)}></button>{/if}

  <main class="main-content">
    <header class="topbar" class:mobile-search-open={showMobileSearch}>
      <button class="mobile-menu mobile-only" aria-label={t('openMenu')} onclick={openMobileNavigation}><Menu size={22} /></button>
      <div class="breadcrumbs"><span>RateMyPlate</span><ChevronRight size={14} /><strong>{activeView === 'top' ? t('topRated') : activeView === 'meals' ? t('myMeals') : t('overview')}</strong></div>
      <div class="topbar-actions">
        <button class="mobile-search-trigger mobile-only" aria-label={t(showMobileSearch ? 'closeSearch' : 'openSearch')} aria-expanded={showMobileSearch} onclick={toggleMobileSearch}>
          {#if showMobileSearch}<X size={18} />{:else}<Search size={17} />{/if}
        </button>
        <div class="search-box" class:mobile-open={showMobileSearch}>
          <Search size={17} class="search-icon" />
          <input bind:this={searchInput} aria-label={t('searchTable')} placeholder={t('searchTable')} bind:value={searchTerm} />
        </div>
        <div class="notification-wrap">
          <button class="icon-button notification-button" aria-label={t('notifications')} aria-expanded={showNotificationMenu} onclick={() => (showNotificationMenu = !showNotificationMenu)}><Heart size={18} />{#if unreadNotifications}<span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>{/if}</button>
          {#if showNotificationMenu}
            <div class="notification-menu" role="region" aria-label={t('notifications')}>
              <div class="notification-menu-heading"><strong>{t('notifications')}</strong>{#if unreadNotifications}<button onclick={markAllNotificationsRead}>{t('markAllRead')}</button>{/if}</div>
              {#if notifications.length}
                {#each notifications as notification}
                  <button class:unread={!notification.read} class="notification-item" onclick={async () => { if (!notification.read && currentUser) { await markAppwriteNotificationRead(notification.id, currentUser.$id).catch(() => null); notifications = notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item); } activeView = 'meals'; filterCircle = notification.circleName; showNotificationMenu = false; await loadUserMeals(); }}>
                    <span class="notification-icon"><Users size={14} /></span><span><strong>{t('groupInviteNotification', { sender: notification.senderName, group: notification.circleName })}</strong><small>{notification.read ? t('notificationRead') : t('notificationUnread')}</small></span>
                  </button>
                {/each}
              {:else}<p class="notification-empty">{t('noNotifications')}</p>{/if}
            </div>
          {/if}
        </div>
        <div class="top-avatar">{#if profileImageUrl}<img src={profileImageUrl} alt="" />{:else}{displayInitials}{/if}</div>
      </div>
    </header>

    <div class="page-wrap">
      <section class="page-heading">
        <div>
          <div class="eyebrow"><Sparkles size={14} /> {new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <h1>{activeView === 'overview' ? t('goodEvening', { name: displayName.split(' ')[0] }) : activeView === 'top' ? t('topRatedHeading') : t('mealsHeading')}</h1>
          <p>{activeView === 'overview' ? t('overviewDescription') : activeView === 'top' ? t('topRatedDescription') : t('mealsDescription')}</p>
        </div>
        <button class="primary-button" onclick={openAddModal}><Plus size={18} strokeWidth={2.3} /> {t('logMeal')}</button>
      </section>

      {#if activeView === 'overview'}
        {#if dataBusy}<div class="data-loading"><div class="status-pulse"></div>{t('openingTable')}</div>{/if}
        <section class="hero-grid">
          <div class="hero-card">
            <div class="hero-copy">
              <div class="hero-kicker"><span class="live-dot"></span> {t('yourTableSeason')}</div>
              <h2>{t('keepGoodStuff')}<br /><em>{t('onTheTable')}</em></h2>
              <p>{t('sharedMemories', { count: meals.length })}</p>
              <button class="text-button" onclick={() => setView('meals')}>{t('browseAllMeals')} <ArrowUpRight size={16} /></button>
            </div>
          </div>
          <div class="stats-stack">
            <div class="stat-card stat-cream"><div class="stat-top"><span class="stat-label">{t('mealsLogged')}</span><Utensils size={18} /></div><strong>{meals.length}</strong><span class="stat-detail"><span class="trend-up">↗ {meals.length ? Math.round((meals.filter((meal) => meal.date.startsWith(String(new Date().getFullYear()))).length / meals.length) * 100) : 0}%</span> {t('thisYear')}</span></div>
            <div class="stat-card stat-sage"><div class="stat-top"><span class="stat-label">{t('tableAverage')}</span><Star size={18} fill="currentColor" /></div><strong>{overallAverage}</strong><span class="stat-detail">{t('acrossRatings', { count: totalRatings })}</span></div>
            <div class="stat-card stat-terracotta"><div class="stat-top"><span class="stat-label">{t('dinnersTogether')}</span><Users size={18} /></div><strong>{circles.length}</strong><span class="stat-detail">{t('activeCircles')}</span></div>
          </div>
        </section>

        <section class="content-grid">
          <div class="timeline-column">
            <div class="section-heading"><div><div class="eyebrow muted">{t('yourArchive')}</div><h2>{t('recentTable')}</h2></div><button class="quiet-button" onclick={() => setView('meals')}>{t('viewArchive')} <ArrowUpRight size={15} /></button></div>
            <div class="timeline-card">
              {#each groups.slice(0, 3) as group}
                <div class="timeline-group">
                  <div class="group-heading"><span class="year-pill">{group.year}</span><span class="month-label">{group.month}</span><span class="group-line"></span><span class="meal-count">{group.meals.length === 1 ? t('meal', { count: group.meals.length }) : t('meals', { count: group.meals.length })}</span></div>
                  <div class="meal-list">
                    {#each group.meals as meal}
                      <button class="meal-row" onclick={() => selectMeal(meal)}>
                        <div class="meal-thumb"><MealImage src={meal.image} alt={meal.name} /><span class="thumb-accent" style={`background: ${meal.accent}`}></span></div>
                        <div class="meal-row-copy"><strong>{meal.name}</strong><span>{groupLabel(meal.circle)} <i>·</i> {meal.addedBy}</span>{#if allowedDietaryTags(meal.dietaryTags).length}<div class="card-tags">{#each allowedDietaryTags(meal.dietaryTags) as tag}<span>{tag === 'vegan' ? t('dietaryVegan') : t('dietaryVegetarian')}</span>{/each}</div>{/if}</div>
                        <div class="row-rating"><Star size={14} fill="currentColor" /><strong>{average(meal.ratings).toFixed(1)}</strong></div>
                        <ChevronRight size={17} class="row-chevron" />
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <aside class="side-column">
            <div class="section-heading compact"><div><div class="eyebrow muted">{t('mostLoved')}</div><h2>{t('topOfTable')}</h2></div><button class="circle-icon-button" aria-label={t('topRated')} onclick={() => setView('top')}><ArrowUpRight size={16} /></button></div>
            <div class="top-card">
              {#each topMeals.slice(0, 3) as meal, index}
                <button class="top-meal" onclick={() => selectMeal(meal)}><span class="rank">0{index + 1}</span><div class="top-thumb"><MealImage src={meal.image} alt={meal.name} /></div><div class="top-copy"><strong>{meal.name}</strong><span>{t('tableRatings', { count: meal.ratings.length })}</span>{#if allowedDietaryTags(meal.dietaryTags).length}<div class="card-tags compact">{#each allowedDietaryTags(meal.dietaryTags) as tag}<span>{tag === 'vegan' ? t('dietaryVegan') : t('dietaryVegetarian')}</span>{/each}</div>{/if}</div><div class="top-score"><Star size={13} fill="currentColor" />{average(meal.ratings).toFixed(1)}</div></button>
              {/each}
              <div class="top-footer"><span><Flame size={14} color="#287344" /> {t('tableOnRoll')}</span><span class="mini-avatar-stack">{#each [...new Set(meals.flatMap((meal) => meal.ratings.map((rating) => rating.initials)))].slice(0, 4) as initials}<i>{initials}</i>{/each}</span></div>
            </div>
            <div class="invite-card"><div class="invite-icon"><Users size={19} /></div><div><strong>{t('bringSomeone')}</strong><p>{t('inviteCopy')}</p><button class="text-button small" onclick={() => openCircleModal()}>{t('inviteCircle')} <ArrowUpRight size={14} /></button></div></div>
          </aside>
        </section>
      {:else if activeView === 'meals'}
        <section class="archive-view">
          <div class="view-toolbar"><div class="filter-pills"><button class:active={archiveSort === 'date'} class="filter-pill" onclick={() => (archiveSort = 'date')}><CalendarDays size={15} /> {t('byDate')}</button><button class:active={archiveSort === 'rating'} class="filter-pill" onclick={() => (archiveSort = 'rating')}><Trophy size={15} /> {t('byRating')}</button></div><div class="filter-control"><button class="quiet-button" onclick={() => (showFilterMenu = !showFilterMenu)}><Filter size={15} /> {t('filter')} <ChevronDown size={14} /></button>{#if showFilterMenu}<div class="filter-menu"><label><span>{t('filterByCircle')}</span><select bind:value={filterCircle}><option value="all">{t('allCircles')}</option><option value="__none__">{t('noGroup')}</option>{#each circles as circle}<option value={circle.name}>{circle.name}</option>{/each}</select></label><label><span>{t('filterByYear')}</span><select bind:value={filterYear}><option value="all">{t('allYears')}</option>{#each years as year}<option value={year}>{year}</option>{/each}</select></label><button class="primary-button small-button" onclick={() => (showFilterMenu = false)}>{t('apply')}</button></div>{/if}</div></div>
          <div class="archive-grid">
            {#each groups as group}
              <section class="archive-group"><div class="archive-heading"><span class="year-pill">{group.year}</span><h2>{group.month}</h2><span class="archive-count">{group.meals.length === 1 ? t('memory', { count: group.meals.length }) : t('memories', { count: group.meals.length })}</span></div><div class="archive-meals">{#each group.meals as meal}<button class="archive-card" onclick={() => selectMeal(meal)}><div class="archive-image"><MealImage src={meal.image} alt={meal.name} /><span class="archive-date">{formatDate(meal.date)}</span><span class="archive-heart" role="button" tabindex="0" aria-label={savedMealIds.includes(meal.id) ? t('removeSavedMeal') : t('saveMeal')} onclick={(event) => { event.stopPropagation(); toggleSavedMeal(meal); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleSavedMeal(meal); } }}>{#if savedMealIds.includes(meal.id)}<Heart size={14} fill="currentColor" />{:else}<Heart size={14} />{/if}</span></div><div class="archive-card-content"><div class="archive-title-row"><h3>{meal.name}</h3><div class="archive-rating"><Star size={13} fill="currentColor" />{average(meal.ratings).toFixed(1)}</div></div><p>{mealNote(meal.note)}</p>{#if allowedDietaryTags(meal.dietaryTags).length}<div class="card-tags">{#each allowedDietaryTags(meal.dietaryTags) as tag}<span>{tag === 'vegan' ? t('dietaryVegan') : t('dietaryVegetarian')}</span>{/each}</div>{/if}<span class="archive-meta">{groupLabel(meal.circle)} <i>·</i> {t('tableRatings', { count: meal.ratings.length })}</span></div></button>{/each}</div></section>
            {:else}<div class="empty-state"><Utensils size={26} /><h3>{t('noMeals')}</h3><p>{t('noMealsCopy')}</p></div>{/each}
          </div>
        </section>
      {:else}
        <section class="top-view">
          <div class="top-intro"><div class="ranking-title"><Trophy size={22} color="#287344" /><div><strong>{t('allTimeFavorites')}</strong><span>{t('rankedByAverage')}</span></div></div><div class="top-summary"><strong>{overallAverage}</strong><span>{t('averageAcrossMeals', { count: meals.length })}</span></div></div>
          <div class="ranking-list">
            {#each topMeals as meal, index}<button class="ranking-row" onclick={() => selectMeal(meal)}><span class:gold={index === 0} class="ranking-number">{String(index + 1).padStart(2, '0')}</span><div class="ranking-image"><MealImage src={meal.image} alt={meal.name} /></div><div class="ranking-copy"><h3>{meal.name}</h3><p>{mealNote(meal.note)}</p><span>{groupLabel(meal.circle)} <i>·</i> {t('loggedDate', { date: formatDate(meal.date) })}</span>{#if allowedDietaryTags(meal.dietaryTags).length}<div class="card-tags">{#each allowedDietaryTags(meal.dietaryTags) as tag}<span>{tag === 'vegan' ? t('dietaryVegan') : t('dietaryVegetarian')}</span>{/each}</div>{/if}</div><div class="rating-people"><div class="rating-avatars">{#each meal.ratings.slice(0, 3) as rating}<span style={`background: ${rating.color}`}>{rating.initials}</span>{/each}</div><small>{t('voices', { count: meal.ratings.length })}</small></div><div class="big-rating"><Star size={17} fill="currentColor" />{average(meal.ratings).toFixed(1)}<span>/ 5</span></div><ChevronRight size={18} color="#c1c8c1" /></button>{/each}
          </div>
        </section>
      {/if}
    </div>
  </main>

  {#if selectedMeal}
    {@const recipeView = parseRecipe(selectedMeal.recipe)}
    <aside class="detail-drawer" aria-label={t('mealDetails')}>
      <div class="drawer-image"><MealImage src={selectedMeal.image} alt={selectedMeal.name} eager /><div class="drawer-image-top"><span class="drawer-tag"><span class="live-dot"></span>{groupLabel(selectedMeal.circle)}</span><button class="drawer-close" aria-label={t('closeDialog')} onclick={() => (selectedMeal = null)}><X size={17} /></button></div><div class="drawer-image-bottom"><span>{formatDate(selectedMeal.date)}</span><div class="drawer-menu-wrap">{#if canManageMeal(selectedMeal)}<button class="drawer-action" aria-label={t('moreOptions')} onclick={() => (showMealMenu = !showMealMenu)}><MoreHorizontal size={19} /></button>{#if showMealMenu}<div class="drawer-menu"><button onclick={() => selectedMeal && openEditMeal(selectedMeal)}>{t('editMeal')}</button><button onclick={removeMeal}>{t('deleteMeal')}</button></div>{/if}{/if}</div></div></div>
      <div class="drawer-content">
        <div class="drawer-title-row">
          <div><div class="eyebrow muted">{t('sharedBy', { name: selectedMeal.addedBy })}</div><h2>{selectedMeal.name}</h2></div>
          <button class:liked={savedMealIds.includes(selectedMeal.id)} class="like-button" aria-label={t('saveMeal')} onclick={() => selectedMeal && toggleSavedMeal(selectedMeal)}><Heart size={18} fill={savedMealIds.includes(selectedMeal.id) ? 'currentColor' : 'none'} /></button>
        </div>
        <p class="drawer-note">{mealNote(selectedMeal.note)}</p>
        {#if selectedMeal.recipe && !recipeView}<div class="recipe-chip"><BookOpen size={16} /><span>{selectedMeal.recipe}</span></div>{/if}
        {#if recipeView}
          <section class="recipe-viewer">
            <div class="recipe-viewer-head"><div><BookOpen size={16} /><strong>{t('recipe')}</strong></div><label>{t('servings')} <input aria-label={t('servings')} type="number" min="1" step="1" bind:value={recipePortionView} /></label></div>
            <div class="recipe-unit-toggle" aria-label={t('ingredientUnit')}><button class:active={recipeUnitSystem === 'metric'} onclick={() => recipeUnitSystem = 'metric'}>{t('metric')}</button><button class:active={recipeUnitSystem === 'imperial'} onclick={() => recipeUnitSystem = 'imperial'}>{t('imperial')}</button></div>
            {#if recipeView.source}<a class="recipe-source" href={recipeView.source} target="_blank" rel="noreferrer">{t('openRecipeSource')}</a>{/if}
            <div class="recipe-view-section"><h3>{t('ingredients')}</h3>{#each recipeView.categories as category}<div class="recipe-view-category"><strong>{recipeCategoryLabel(category)}</strong>{#each recipeView.ingredients.filter((item) => item.category === category) as ingredient (ingredient.id)}<div><span>{formatIngredient(ingredient, recipeView.portions, Math.max(1, Number(recipePortionView) || 1), recipeUnitSystem, language)}</span></div>{/each}</div>{/each}</div>
            <div class="recipe-view-section"><h3>{t('method')}</h3><ol class="recipe-view-steps">{#each recipeView.steps as step, index (step.id)}<li><span>{index + 1}</span><p>{formatStep(step.instructions, recipeView, Math.max(1, Number(recipePortionView) || 1), recipeUnitSystem, language)}</p></li>{/each}</ol></div>
          </section>
        {/if}
        {#if selectedMeal.dietaryTags?.length}
          <div class="meal-dietary-tags" aria-label={t('dietaryTags')}>
            {#each selectedMeal.dietaryTags as tag}
              {@const option = dietaryTagOptions.find((item) => item.value === tag)}
              {#if option}<span class="dietary-tag">{t(option.key)}</span>{/if}
            {/each}
          </div>
        {/if}
        <div class="rating-summary">
          <div class="rating-number">
            <strong>{average(selectedMeal.ratings).toFixed(1)}</strong>
            <div class="stars">{#each Array(5) as _, i}<Star class={starFill(average(selectedMeal.ratings), i) === 'half' ? 'half' : undefined} size={15} fill={starFill(average(selectedMeal.ratings), i) === 'empty' ? 'none' : 'currentColor'} />{/each}</div>
            <span>{t('tableRatings', { count: selectedMeal.ratings.length })}</span>
          </div>
          <div class="rating-bars">
            {#each [5, 4, 3, 2, 1] as level}
              <div class="rating-bar-row"><span>{level}</span><div class="bar-track"><div class="bar-fill" style={`width: ${selectedMeal.ratings.length ? (selectedMeal.ratings.filter((r) => Math.round(r.value) === level).length / selectedMeal.ratings.length) * 100 : 0}%`}></div></div><small>{selectedMeal.ratings.filter((r) => Math.round(r.value) === level).length}</small></div>
            {/each}
          </div>
        </div>
        <div class="rating-divider"></div>
        <div class="your-rating">
          <div><strong>{t('yourRating')}</strong><span>{t('howDidItLand')}</span></div>
          <div class="rating-picker">
            {#each [1, 2, 3, 4, 5] as value}
              <span class="rating-star">
                <button class:chosen={ratingDraft >= value - 0.5} class="star-half" aria-label={t('rateValue', { value: value - 0.5 })} onclick={() => (ratingDraft = value - 0.5)}><Star size={22} fill={ratingDraft >= value - 0.5 ? 'currentColor' : 'none'} /></button>
                <button class:chosen={ratingDraft >= value} class="star-half" aria-label={t('rateValue', { value })} onclick={() => (ratingDraft = value)}><Star size={22} fill={ratingDraft >= value ? 'currentColor' : 'none'} /></button>
              </span>
            {/each}
          </div>
          <label class="review-field"><span>{t('reviewOptional')}</span><textarea rows="3" maxlength="280" placeholder={t('reviewPlaceholder')} bind:value={reviewDraft}></textarea></label>
          <button class="save-rating" disabled={!ratingDraft} onclick={saveRating}>{ratingDraft ? t('saveStarRating', { count: ratingDraft }) : t('chooseRating')}<Check size={15} /></button>
        </div>
        <div class="rated-by">
          <div class="rated-heading"><strong>{t('ratedByTable')}</strong><span>{t('people', { count: selectedMeal.ratings.length })}</span></div>
          {#each selectedMeal.ratings as rating}
            <div class="person-rating">
              <span class="person-avatar" style={`background: ${rating.color}`}>{rating.initials}</span>
              <span class="person-name">{rating.name}{#if rating.isCurrentUser} <small>{t('you')}</small>{/if}</span>
              <span class="person-stars">{#each Array(5) as _, i}<Star class={starFill(rating.value, i) === 'half' ? 'half' : undefined} size={12} fill={starFill(rating.value, i) === 'empty' ? 'none' : 'currentColor'} />{/each}</span>
              <strong>{rating.value.toFixed(1)}</strong>
              {#if rating.review}<p class="person-review">“{rating.review}”</p>{/if}
            </div>
          {/each}
        </div>
      </div>
    </aside>
  {/if}

  {#if showCircleModal}
    {@const canManageCircle = !editingCircle || !appwriteConfigured || editingCircle.ownerId === currentUser?.$id}
    <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showCircleModal = false)}>
      <dialog open class="add-modal circle-modal" aria-modal="true" aria-labelledby="circle-title">
        <div class="modal-header"><div><div class="eyebrow"><Users size={14} /> {t('circles')}</div><h2 id="circle-title">{editingCircle ? t('manageCircle') : t('newCircle')}</h2><p>{editingCircle ? editingCircle.name : t('inviteCopy')}</p></div><button class="drawer-close light" aria-label={t('closeDialog')} onclick={() => (showCircleModal = false)}><X size={18} /></button></div>
        <form onsubmit={(event) => { event.preventDefault(); saveCircle(); }}>
          {#if canManageCircle}
            <div class="form-grid"><label class="field full"><span>{t('circleName')} <i>*</i></span><input required placeholder={t('newCircle')} bind:value={circleForm.name} /></label><label class="field full"><span>{t('circleColor')}</span><div class="color-picker"><input type="color" bind:value={circleForm.color} /><span>{circleForm.color}</span></div></label><div class="field full invite-user-field"><label for="circle-invite-username">{t('inviteUsername')} <em>{t('optional')}</em></label><input id="circle-invite-username" pattern="@?[A-Za-z0-9._-]+" placeholder="@username" autocomplete="off" role="combobox" aria-controls="circle-invite-suggestions" aria-autocomplete="list" aria-expanded={circleInviteSuggestionsOpen} bind:value={circleInviteUsername} oninput={(event) => searchCircleInviteUsers(event.currentTarget.value)} onfocus={() => searchCircleInviteUsers(circleInviteUsername)} />{#if circleInviteSuggestionsOpen && circleInviteSuggestions.length}<ul id="circle-invite-suggestions" class="invite-suggestions" role="listbox">{#each circleInviteSuggestions as profile (profile.userId)}<li role="presentation"><button type="button" role="option" aria-selected="false" onclick={() => selectCircleInviteUser(profile)}><strong>@{profile.username}</strong><span>{profile.displayName}</span></button></li>{/each}</ul>{:else if circleInviteSuggestionsOpen}<div class="invite-no-results">{circleInviteSearchFailed ? t('profilesUnavailable') : t('noUsernameMatches')}</div>{/if}</div></div>
          {/if}
          {#if editingCircle}
            <section class="circle-members" aria-labelledby="circle-members-title"><div class="members-heading"><strong id="circle-members-title">{t('groupMembers')}</strong><span>{t('people', { count: circleMembers.length })}</span></div>
              {#if circleMembers.length === 0}<p class="members-empty">{t('membersLoading')}</p>{/if}
              {#each circleMembers as member (member.userId)}<div class="circle-member-row"><span class="member-avatar">{(member.displayName || member.username).slice(0, 1).toUpperCase()}</span><span class="member-copy"><strong>@{member.username}</strong><small>{member.displayName ? `${member.displayName}${member.isPending ? ` · ${t('invitePending')}` : ''}` : member.isPending ? t('invitePending') : member.username}</small></span>{#if member.isAdmin}<span class="admin-badge">{t('groupAdmin')}</span>{:else if canManageCircle}<button type="button" class="member-remove" onclick={() => removeCircleMember(member)} disabled={circleBusy}>{t('removeMember')}</button>{/if}</div>{/each}
            </section>
          {/if}
          <div class="modal-footer"><span class="privacy-note"><Users size={15} /> {t('sharedWithCircle')}</span><div class="modal-actions">{#if editingCircle && canManageCircle}<button type="button" class="danger-button" onclick={() => editingCircle && removeCircle(editingCircle)} disabled={circleBusy}>{t('deleteCircle')}</button>{/if}{#if canManageCircle}<button type="submit" class="primary-button" disabled={circleBusy}>{editingCircle ? t('saveCircle') : t('createCircle')} <Check size={16} /></button>{/if}</div></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if showAddModal}
    <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showAddModal = false)}>
      <dialog open class="add-modal" aria-modal="true" aria-labelledby="add-meal-title">
        <div class="modal-header"><div><div class="eyebrow"><Sparkles size={14} /> {editingMeal ? t('editMeal') : t('newMemory')}</div><h2 id="add-meal-title">{editingMeal ? t('editMeal') : t('whatDidYouMake')}</h2><p>{t('newMemoryCopy')}</p></div><button class="drawer-close light" aria-label={t('closeDialog')} onclick={() => { showAddModal = false; editingMeal = null; }}><X size={18} /></button></div>
        <form onsubmit={(event) => { event.preventDefault(); saveMeal(); }}>
          <div class="form-grid">
            <label class="field full"><span>{t('dishName')} <i>*</i></span><input required placeholder={t('dishNamePlaceholder')} bind:value={newMeal.name} /></label>
            <label class="field"><span>{t('whenWasIt')}</span><div class="input-with-icon"><CalendarDays size={16} /><input type="date" bind:value={newMeal.date} /></div></label>
            <label class="field"><span>{t('whichCircle')}</span><div class="select-wrap"><select bind:value={newMeal.circle}><option value="">{t('unsorted')}</option>{#each circles as circle}<option value={circle.name}>{circle.name}</option>{/each}</select><ChevronDown size={15} /></div></label>
            <fieldset class="recipe-editor full">
              <legend>{t('recipe')} <em>{t('optional')}</em></legend>
              <div class="recipe-editor-top"><label class="field"><span>{t('recipeSource')}</span><input placeholder={t('recipePlaceholder')} bind:value={newMeal.recipeData.source} /></label><label class="field"><span>{t('basePortions')}</span><input type="number" min="1" step="1" bind:value={newMeal.recipeData.portions} /></label></div>
              <div class="recipe-subheading"><strong>{t('ingredientCategories')}</strong><span>{t('ingredientCategoriesHint')}</span></div>
              <div class="recipe-category-list">{#each newMeal.recipeData.categories as category}<span>{recipeCategoryLabel(category)}<button type="button" aria-label={t('removeCategory', { category: recipeCategoryLabel(category) })} disabled={newMeal.recipeData.categories.length <= 1 || newMeal.recipeData.ingredients.some((ingredient) => ingredient.category === category)} onclick={() => newMeal.recipeData.categories = newMeal.recipeData.categories.filter((item) => item !== category)}><X size={12} /></button></span>{/each}</div>
              <div class="recipe-category-add"><input aria-label={t('ingredientCategories')} placeholder={t('addCategory')} bind:value={recipeCategoryDraft} onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), addRecipeCategory())} /><button type="button" class="quiet-button" onclick={addRecipeCategory}><Plus size={14} /> {t('addCategory')}</button></div>
              <div class="recipe-subheading"><strong>{t('ingredients')}</strong><button type="button" class="quiet-button" onclick={addRecipeIngredient}><Plus size={14} /> {t('addIngredient')}</button></div>
              {#each newMeal.recipeData.ingredients as ingredient (ingredient.id)}
                <div class="recipe-ingredient-row"><input aria-label={t('ingredientName')} placeholder={t('ingredientNamePlaceholder')} bind:value={ingredient.name} /><input aria-label={t('ingredientAmount')} type="number" min="0" step="any" bind:value={ingredient.amount} /><input aria-label={t('ingredientUnit')} list="ingredient-unit-options" placeholder={t('ingredientUnitPlaceholder')} bind:value={ingredient.unit} /><select aria-label={t('ingredientCategory')} bind:value={ingredient.category}>{#each newMeal.recipeData.categories as category}<option value={category}>{recipeCategoryLabel(category)}</option>{/each}</select><button type="button" class="recipe-remove" aria-label={t('deleteMeal')} onclick={() => removeRecipeIngredient(ingredient.id)}><X size={15} /></button></div>
              {/each}
              <datalist id="ingredient-unit-options"><option value="g"></option><option value="kg"></option><option value="ml"></option><option value="l"></option><option value={t('unitTeaspoon')}></option><option value={t('unitTablespoon')}></option><option value={t('unitCup')}></option><option value={t('unitPinch')}></option><option value={t('unitHandful')}></option><option value={t('unitPackage')}></option><option value={t('unitPiece')}></option></datalist>
              <div class="recipe-subheading"><strong>{t('instructions')}</strong><button type="button" class="quiet-button" onclick={addRecipeStep}><Plus size={14} /> {t('addStep')}</button></div>
              {#each newMeal.recipeData.steps as step, index (step.id)}
                <div class="recipe-step-row"><span class="recipe-step-number">{index + 1}</span><textarea aria-label={`${t('instructions')} ${index + 1}`} rows="2" placeholder={t('describeStep')} bind:value={step.instructions}></textarea><button type="button" class="recipe-remove" aria-label={t('deleteMeal')} disabled={newMeal.recipeData.steps.length <= 1} onclick={() => newMeal.recipeData.steps = newMeal.recipeData.steps.filter((item) => item.id !== step.id)}><X size={15} /></button></div>
                {#if newMeal.recipeData.ingredients.length}<div class="recipe-link-row"><small>{t('insertLinkedAmount')}</small>{#each newMeal.recipeData.ingredients.filter((item) => item.name.trim()) as ingredient (ingredient.id)}<button type="button" onclick={() => linkIngredientInStep(step.id, ingredient.id)}>{ingredient.name}</button>{/each}</div>{/if}
              {/each}
            </fieldset>
            <label class="field full"><span>{t('mealNote')} <em>{t('optional')}</em></span><textarea rows="3" placeholder={t('notePlaceholder')} bind:value={newMeal.note}></textarea></label>
            <fieldset class="dietary-field full">
              <legend>{t('dietaryTags')}</legend>
              <div class="dietary-options">
                {#each dietaryTagOptions as option}
                  <label class:active={newMeal.dietaryTags.includes(option.value)} class="dietary-option">
                    <input type="checkbox" checked={newMeal.dietaryTags.includes(option.value)} onchange={() => toggleDietaryTag(option.value)} />
                    {t(option.key)}
                  </label>
                {/each}
              </div>
              <small>{t('dietaryInfo')}</small>
            </fieldset>
          </div>
          <div class="upload-field">
            <input id="meal-image" type="file" accept="image/*" onchange={handleImageUpload} />
            <label for="meal-image" class:has-image={imagePreview}>
              {#if imagePreview}
                <div class="upload-preview" style={`background-image: url("${imagePreview}")`}></div>
              {:else}
                <div class="upload-icon"><ImagePlus size={20} /></div>
              {/if}
              <div class="upload-copy">
                <strong>{imagePreview ? t('swapPhoto') : t('addPhoto')}</strong>
                <span>{imagePreview ? imageFile?.name ?? t('fileHelp') : t('fileHelp')}</span>
              </div>
              <Upload size={17} class="upload-arrow" />
            </label>
          </div>
          <div class="modal-footer"><span class="privacy-note"><CircleUserRound size={15} /> {newMeal.circle ? t('sharedWithCircle') : t('noGroupMeal')}</span><button type="submit" class="primary-button" disabled={mealBusy || imageProcessing || !newMeal.name.trim()} aria-busy={mealBusy || imageProcessing}>{#if mealBusy}{t('savingMeal')}{:else if imageProcessing}{t('optimizingImage')}{:else if editingMeal}<Check size={17} /> {t('saveMealChanges')}{:else}<Plus size={17} /> {t('addToTable')}{/if}</button></div>
        </form>
      </dialog>
    </div>
  {/if}

  {#if showToast}<div class="toast"><span class="toast-check"><Check size={14} /></span>{toastMessage}</div>{/if}
  </div>
{/if}

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

  :global(*) { box-sizing: border-box; }
  :global(html), :global(body) { width: 100%; max-width: 100%; overflow-x: hidden; }
  :global(body) { margin: 0; min-width: 320px; color: #1d2b25; background: #f8f7f2; font-family: 'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  :global(button), :global(input), :global(textarea), :global(select) { font: inherit; }
  :global(button) { cursor: pointer; }
  :global(button:focus-visible), :global(input:focus-visible), :global(textarea:focus-visible), :global(select:focus-visible) { outline: 3px solid rgba(219, 138, 89, .28); outline-offset: 2px; }
  .auth-shell { display: grid; place-items: center; min-height: 100vh; padding: 24px; background: #f4f3ed; }
  .auth-card { width: min(100%, 430px); padding: 32px; border: 1px solid #ebe8df; border-radius: 20px; background: #fffefa; box-shadow: 0 25px 70px rgba(29,49,40,.09); }
  .auth-card-wide { display: grid; grid-template-columns: 1fr 1fr; width: min(100%, 820px); padding: 0; overflow: hidden; }
  .auth-visual { display: flex; min-height: 550px; flex-direction: column; padding: 30px; color: #f2eee4; background: #1d3128; }
  .auth-visual .brand-row { padding: 0; }
  .auth-visual-copy { margin: auto 0; }
  .auth-visual-copy h1 { margin-top: 20px; color: #f8f0e3; font-family: 'DM Serif Display', Georgia, serif; font-size: 42px; font-weight: 400; letter-spacing: -.04em; line-height: 1; }
  .auth-visual-copy h1 em { color: #f1b98e; font-style: italic; }
  .auth-visual-copy p { max-width: 250px; margin-top: 20px; color: #a5b7aa; font-size: 11px; line-height: 1.7; }
  .auth-visual-note { display: flex; align-items: center; gap: 7px; color: #91a79a; font-size: 9px; }
  .auth-visual-note span { color: #f1b98e; }
  .auth-form-panel { display: flex; flex-direction: column; justify-content: center; padding: 42px 35px; }
  .auth-form-heading h2 { margin-top: 8px; color: #304338; font-family: 'DM Serif Display', Georgia, serif; font-size: 32px; font-weight: 400; }
  .auth-form-heading p { max-width: 250px; margin-top: 8px; color: #9da79f; font-size: 10px; line-height: 1.6; }
  .auth-form { display: flex; flex-direction: column; gap: 15px; margin-top: 27px; }
  .auth-form .field input { height: 42px; }
  .auth-submit { justify-content: center; width: 100%; margin-top: 3px; }
  .auth-submit:disabled { cursor: wait; opacity: .65; }
  .auth-switch { margin-top: 19px; padding: 0; border: 0; color: #bb6f4d; background: transparent; font-size: 10px; text-align: left; }
  .auth-error { padding: 10px 11px; border: 1px solid #edc9bb; border-radius: 8px; color: #a94f38; background: #fff4ee; font-size: 9px; line-height: 1.45; }
  .auth-loading .auth-card { text-align: center; }
  .auth-loading .brand-mark { margin: 0 auto 20px; }
  .auth-loading h1 { color: #304338; font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; font-weight: 400; }
  .auth-loading p { margin-top: 7px; color: #9da79f; font-size: 10px; }
  .data-loading { display: flex; align-items: center; gap: 7px; margin-bottom: 16px; color: #9aa79d; font-size: 10px; }
  .app-shell { display: flex; width: 100%; max-width: 100vw; min-height: 100vh; overflow-x: clip; }
  .sidebar { width: 246px; flex: 0 0 246px; display: flex; flex-direction: column; padding: 27px 16px 18px; background: #1d3128; color: #f2eee4; position: relative; z-index: 10; }
  .brand-row { display: flex; gap: 10px; align-items: center; padding: 0 10px; }
  .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 11px; color: #1d3128; background: #f1b98e; }
  .brand-name { font-family: 'DM Serif Display', Georgia, serif; font-size: 20px; line-height: 1; letter-spacing: -.02em; }
  .brand-subtitle { margin-top: 4px; color: #a5b7aa; font-size: 9px; text-transform: uppercase; letter-spacing: .14em; }
  .profile-card { display: flex; align-items: center; gap: 9px; padding: 11px 10px; margin: 35px 0 27px; border: 1px solid rgba(239, 234, 218, .1); border-radius: 14px; background: rgba(255,255,255,.055); }
  .profile-avatar, .top-avatar { display: grid; place-items: center; color: #1e382e; background: #efbc91; font-weight: 700; letter-spacing: .02em; }
  .profile-avatar { width: 31px; height: 31px; border-radius: 10px; font-size: 10px; }
  .profile-copy { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .profile-copy strong { font-size: 12px; font-weight: 600; }
  .profile-copy span { color: #99aea0; font-size: 10px; }
  .nav-label { padding: 0 11px 9px; color: #738b7d; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
  .circles-label { margin-top: 31px; }
  .main-nav { display: flex; flex-direction: column; gap: 3px; }
  .nav-item, .circle-item, .add-circle { border: 0; color: #9eb0a5; background: transparent; display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 11px; border-radius: 10px; text-align: left; transition: .2s ease; }
  .nav-item { font-size: 12px; }
  .nav-item:hover, .circle-item:hover, .add-circle:hover { color: #f6f0e6; background: rgba(255,255,255,.06); }
  .nav-item.active { color: #1c3027; background: #f1b98e; font-weight: 700; }
  .nav-count, .circle-count { margin-left: auto; font-size: 10px; opacity: .6; }
  .circle-list { display: flex; flex-direction: column; gap: 2px; }
  .circle-item { padding: 8px 11px; font-size: 11px; }
  .circle-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; }
  .terracotta { background: #d9875f; } .sage { background: #8ea98e; } .gold { background: #e6b65e; }
  .add-circle { margin-top: 8px; padding-left: 12px; color: #779082; font-size: 11px; }
  .sidebar-bottom { display: flex; flex-direction: column; gap: 12px; margin-top: auto; padding: 15px 0 0; border-top: 1px solid rgba(255,255,255,.1); }
  .sync-status { display: flex; align-items: center; gap: 7px; padding: 0 11px; color: #879c90; font-size: 10px; }
  .status-pulse { width: 6px; height: 6px; border-radius: 50%; background: #e5af62; box-shadow: 0 0 0 3px rgba(229,175,98,.12); }
  .sync-status.connected .status-pulse { background: #8ec28e; box-shadow: 0 0 0 3px rgba(142,194,142,.12); }
  .nav-item.settings { padding-top: 7px; padding-bottom: 7px; }
  .main-content { min-width: 0; flex: 1; background: #f8f7f2; }
  .topbar { height: 76px; display: flex; align-items: center; justify-content: space-between; padding: 0 42px; border-bottom: 1px solid #ebe9e1; background: rgba(248,247,242,.84); }
  .breadcrumbs { display: flex; align-items: center; gap: 8px; color: #9da49d; font-size: 11px; }
  .breadcrumbs strong { color: #52615a; font-weight: 600; }
  .topbar-actions { display: flex; align-items: center; gap: 18px; }
  .search-box { width: 217px; display: flex; align-items: center; gap: 8px; padding: 8px 9px 8px 12px; border: 1px solid #e6e4dc; border-radius: 9px; color: #9aa29b; background: #fffefa; }
  .search-box input { min-width: 0; flex: 1; border: 0; outline: 0; color: #35443c; background: transparent; font-size: 11px; }
  .search-box input::placeholder { color: #aeb4ad; }
  .icon-button, .circle-icon-button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; color: #68776e; background: transparent; position: relative; }
  .notification-button span { position: absolute; top: 4px; right: 4px; width: 5px; height: 5px; border: 1px solid #f8f7f2; border-radius: 50%; background: #db8a59; }
  .top-avatar { width: 30px; height: 30px; border-radius: 9px; font-size: 10px; }
  .page-wrap { max-width: 1370px; margin: 0 auto; padding: 39px 42px 70px; }
  .page-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 29px; }
  .eyebrow { display: flex; align-items: center; gap: 6px; color: #c27653; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .eyebrow.muted { color: #a3aca4; letter-spacing: .12em; }
  h1, h2, h3, p { margin: 0; }
  h1 { margin-top: 10px; color: #25362d; font-family: 'DM Serif Display', Georgia, serif; font-size: clamp(30px, 3.5vw, 43px); font-weight: 400; letter-spacing: -.04em; line-height: 1; }
  .page-heading p { margin-top: 10px; color: #89928b; font-size: 12px; }
  .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; padding: 0 16px; border: 0; border-radius: 9px; color: #fff8ee; background: #db8a59; font-size: 11px; font-weight: 700; box-shadow: 0 7px 18px rgba(204, 113, 71, .16); transition: .2s ease; }
  .primary-button:disabled { opacity: .62; cursor: wait; box-shadow: none; }
  .primary-button:hover { background: #c8734b; transform: translateY(-1px); }
  .hero-grid { display: grid; grid-template-columns: minmax(0, 1.85fr) minmax(190px, .68fr); gap: 16px; }
  .hero-card { min-height: 282px; display: flex; overflow: hidden; border-radius: 17px; background: #e7eee7; position: relative; }
  .hero-copy { position: relative; z-index: 2; width: 57%; padding: 32px 30px; }
  .hero-kicker { display: flex; align-items: center; gap: 7px; color: #627d6d; font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
  .live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #da8a59; box-shadow: 0 0 0 3px rgba(218,138,89,.12); }
  .hero-card h2 { margin-top: 18px; color: #233c30; font-family: 'DM Serif Display', Georgia, serif; font-size: 37px; font-weight: 400; letter-spacing: -.04em; line-height: .98; }
  .hero-card h2 em { color: #d17b51; font-style: italic; }
  .hero-card p { max-width: 295px; margin-top: 16px; color: #718377; font-size: 11px; line-height: 1.6; }
  .text-button, .quiet-button { display: inline-flex; align-items: center; gap: 6px; border: 0; color: #c77652; background: transparent; font-size: 11px; font-weight: 700; }
  .text-button { margin-top: 23px; padding: 0; }
  .text-button:hover, .quiet-button:hover { color: #a95c3e; }
  .hero-art { width: 43%; position: relative; overflow: hidden; }
  .art-blob { position: absolute; top: 32px; right: -20px; width: 235px; height: 235px; border-radius: 46% 54% 60% 40%; background: #c8ddc9; transform: rotate(25deg); }
  .art-plate { position: absolute; top: 58px; right: 33px; width: 185px; height: 185px; border: 8px solid #f7f3e8; border-radius: 50%; background: #e9e6d7; box-shadow: 7px 12px 20px rgba(59,85,68,.13), inset 0 0 0 3px rgba(138,159,139,.2); transform: rotate(-14deg); }
  .art-food { position: absolute; top: 38px; left: 29px; width: 113px; height: 103px; border-radius: 51% 49% 44% 56%; background: radial-gradient(circle at 30% 32%, #f2c07a 0 8%, transparent 9%), radial-gradient(circle at 61% 58%, #dd8d53 0 11%, transparent 12%), radial-gradient(circle at 67% 29%, #9eae64 0 8%, transparent 9%), radial-gradient(circle at 39% 72%, #e1a267 0 12%, transparent 13%), #d7764e; box-shadow: inset 12px -10px 0 rgba(167,76,45,.18); }
  .art-garnish { position: absolute; width: 27px; height: 9px; border-radius: 80% 20%; background: #839c70; transform: rotate(40deg); }.garnish-one { top: 40px; left: 94px; }.garnish-two { top: 116px; left: 46px; transform: rotate(-25deg); }
  .art-note { position: absolute; display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 6px; color: #6c796c; background: rgba(255,253,245,.88); font-size: 8px; font-weight: 700; box-shadow: 0 4px 15px rgba(57,80,62,.08); }.note-one { top: 37px; right: 12px; }.note-two { bottom: 31px; left: 17px; transform: rotate(-5deg); }.note-two span { color: #d88a5a; }
  .stats-stack { display: grid; gap: 12px; }
  .stat-card { padding: 18px 19px; border-radius: 15px; min-height: 83px; }
  .stat-cream { color: #6e563d; background: #f1e8d8; }.stat-sage { color: #526d5e; background: #dbe8dc; }.stat-terracotta { color: #7b4d39; background: #f1daca; }
  .stat-top { display: flex; justify-content: space-between; align-items: center; font-size: 15px; }.stat-label { font-size: 10px; font-weight: 700; letter-spacing: .03em; }.stat-card strong { display: block; margin-top: 5px; font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; font-weight: 400; line-height: 1; }.stat-detail { display: block; margin-top: 4px; opacity: .7; font-size: 9px; }.trend-up { color: #648d67; font-weight: 700; }
  .content-grid { display: grid; grid-template-columns: minmax(0, 1.47fr) minmax(285px, .72fr); gap: 30px; margin-top: 39px; }
  .section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 14px; }.section-heading.compact { align-items: center; }.section-heading h2 { margin-top: 5px; color: #293a31; font-family: 'DM Serif Display', Georgia, serif; font-size: 22px; font-weight: 400; letter-spacing: -.025em; }.quiet-button { color: #8b968e; font-size: 10px; }.circle-icon-button { border: 1px solid #e6e3da; border-radius: 8px; color: #87938a; background: #fffefa; }
  .timeline-card, .top-card { overflow: hidden; border: 1px solid #ebe8df; border-radius: 13px; background: #fffefa; }.timeline-group { padding: 18px 18px 9px; }.timeline-group + .timeline-group { border-top: 1px solid #eeeae1; }.group-heading { display: flex; align-items: center; gap: 9px; }.year-pill { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 5px; color: #a46044; background: #f5e2d5; font-size: 9px; font-weight: 700; }.month-label { color: #66746c; font-size: 11px; font-weight: 700; }.group-line { height: 1px; flex: 1; background: #eeeae2; }.meal-count { color: #afb5ae; font-size: 9px; }.meal-list { margin-top: 9px; }.meal-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 0; border: 0; border-top: 1px solid #f0ede7; color: inherit; background: transparent; text-align: left; }.meal-row:hover .meal-row-copy strong { color: #c26e4a; }.meal-thumb { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 9px; background-color: #e7e3d8; background-position: center; background-size: cover; position: relative; }.thumb-accent { position: absolute; right: 4px; bottom: 4px; width: 6px; height: 6px; border-radius: 50%; border: 1px solid rgba(255,255,255,.75); }.meal-row-copy { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }.meal-row-copy strong { overflow: hidden; color: #39483f; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; transition: .2s ease; }.meal-row-copy span, .archive-meta { overflow: hidden; color: #a2aaa3; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.meal-row-copy i, .archive-meta i, .ranking-copy i { margin: 0 3px; color: #d5d5ca; font-style: normal; }.row-rating { display: flex; align-items: center; gap: 4px; color: #d79a4f; font-size: 11px; }.row-rating strong { color: #68766d; font-size: 10px; }
  .top-card { padding: 8px 15px 0; }.top-meal { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid #efede7; color: inherit; background: transparent; text-align: left; }.top-meal:last-of-type { border-bottom: 0; }.top-meal:hover .top-copy strong { color: #c26e4a; }.rank { width: 17px; color: #c6cbc4; font-family: 'DM Serif Display', Georgia, serif; font-size: 12px; }.top-thumb { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 8px; position: relative; }.top-copy { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }.top-copy strong { overflow: hidden; color: #4a584f; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; transition: .2s ease; }.top-copy span { color: #b0b6ae; font-size: 8px; }.top-score { display: flex; align-items: center; gap: 3px; color: #d79a4f; font-size: 10px; }.top-footer { display: flex; align-items: center; justify-content: space-between; padding: 15px 0 14px; color: #a2aaa3; font-size: 9px; }.top-footer > span:first-child { display: flex; align-items: center; gap: 5px; }.mini-avatar-stack { display: flex; align-items: center; }.mini-avatar-stack i { display: grid; place-items: center; width: 20px; height: 20px; margin-left: -4px; border: 2px solid #fffefa; border-radius: 50%; color: #496052; background: #d4e1d4; font-size: 6px; font-style: normal; font-weight: 700; }.mini-avatar-stack i:first-child { margin-left: 0; background: #f0c4a5; }.mini-avatar-stack i:nth-child(3) { background: #f1dfa6; }.mini-avatar-stack i:last-child { color: #718078; background: #ecebe4; }
  .invite-card { display: flex; align-items: center; gap: 11px; margin-top: 14px; padding: 14px; border: 1px dashed #ddd9d0; border-radius: 12px; background: transparent; }.invite-icon { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; border-radius: 9px; color: #c97953; background: #f4e2d4; }.invite-card strong { color: #637067; font-size: 10px; }.invite-card p { margin-top: 4px; color: #a5ada5; font-size: 9px; }.text-button.small { margin-top: 8px; font-size: 9px; }
  .archive-view, .top-view { min-height: 500px; }.view-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }.filter-pills { display: flex; gap: 5px; }.filter-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border: 1px solid #e5e2d9; border-radius: 8px; color: #9aa29c; background: transparent; font-size: 10px; }.filter-pill.active { border-color: #e7c9b7; color: #bf6f4c; background: #fbf0e9; font-weight: 700; }.archive-grid { display: flex; flex-direction: column; gap: 32px; }.archive-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 13px; }.archive-heading h2 { color: #34443a; font-family: 'DM Serif Display', Georgia, serif; font-size: 23px; font-weight: 400; }.archive-count { margin-left: 3px; color: #afb6ae; font-size: 10px; }.archive-meals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }.archive-card { overflow: hidden; padding: 0; border: 1px solid #ebe8df; border-radius: 13px; color: inherit; background: #fffefa; text-align: left; transition: .2s ease; }.archive-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(41,58,49,.07); }.archive-image { height: 142px; background-color: #e3dfd2; position: relative; }.archive-date, .archive-heart { position: absolute; top: 10px; color: #fff; background: rgba(25,40,31,.5); backdrop-filter: blur(5px); }.archive-date { left: 10px; padding: 5px 7px; border-radius: 5px; font-size: 8px; font-weight: 700; }.archive-heart { display: grid; place-items: center; right: 10px; width: 25px; height: 25px; border-radius: 50%; }.archive-card-content { padding: 13px; }.archive-title-row { display: flex; align-items: start; justify-content: space-between; gap: 7px; }.archive-title-row h3 { color: #3b4b41; font-size: 12px; font-weight: 700; }.archive-rating { display: flex; align-items: center; gap: 3px; color: #d79a4f; font-size: 10px; font-weight: 700; }.archive-card-content p { display: -webkit-box; min-height: 29px; margin-top: 7px; overflow: hidden; color: #9ba39c; font-size: 9px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.archive-meta { display: block; margin-top: 13px; font-size: 9px; }.empty-state { display: grid; place-items: center; min-height: 300px; padding: 40px; border: 1px dashed #ddd9cf; border-radius: 14px; color: #aab1aa; text-align: center; }.empty-state h3 { margin-top: 10px; color: #65746b; font-family: 'DM Serif Display', Georgia, serif; font-size: 22px; font-weight: 400; }.empty-state p { margin-top: 5px; font-size: 11px; }
  .top-intro { display: flex; align-items: center; justify-content: space-between; max-width: 850px; padding: 20px 22px; border: 1px solid #ebe8df; border-radius: 14px; background: #fffefa; }.ranking-title { display: flex; align-items: center; gap: 12px; color: #d08a4c; }.ranking-title strong { display: block; color: #3a4b40; font-family: 'DM Serif Display', Georgia, serif; font-size: 20px; font-weight: 400; }.ranking-title span { display: block; margin-top: 4px; color: #a5ada5; font-size: 10px; }.top-summary { display: flex; align-items: center; gap: 9px; }.top-summary strong { color: #55735e; font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; font-weight: 400; }.top-summary span { color: #a5ada5; font-size: 9px; line-height: 1.4; }.ranking-list { max-width: 850px; margin-top: 18px; border: 1px solid #ebe8df; border-radius: 14px; background: #fffefa; }.ranking-row { display: flex; align-items: center; gap: 16px; width: 100%; padding: 16px 19px; border: 0; border-bottom: 1px solid #efede7; color: inherit; background: transparent; text-align: left; }.ranking-row:last-child { border-bottom: 0; }.ranking-row:hover { background: #fffcf4; }.ranking-number { width: 20px; color: #c5cbc4; font-family: 'DM Serif Display', Georgia, serif; font-size: 17px; }.ranking-number.gold { color: #d89d53; }.ranking-image { width: 62px; height: 55px; flex: 0 0 62px; border-radius: 10px; position: relative; }.ranking-copy { flex: 1; min-width: 0; }.ranking-copy h3 { color: #3c4b42; font-size: 12px; }.ranking-copy p { max-width: 420px; margin-top: 5px; overflow: hidden; color: #a2aaa3; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.ranking-copy span { display: block; margin-top: 8px; color: #afb5ae; font-size: 9px; }.rating-people { display: flex; flex-direction: column; align-items: end; gap: 5px; }.rating-avatars { display: flex; padding-left: 9px; }.rating-avatars span { display: grid; place-items: center; width: 20px; height: 20px; margin-left: -7px; border: 2px solid #fffefa; border-radius: 50%; color: #fff; font-size: 6px; font-weight: 700; }.rating-people small { color: #a9b0a9; font-size: 8px; }.big-rating { display: flex; align-items: center; gap: 4px; min-width: 55px; color: #d79a4f; font-size: 15px; font-weight: 700; }.big-rating span { margin-left: -2px; color: #a9b0a9; font-size: 9px; font-weight: 400; }
  .detail-drawer { width: 337px; flex: 0 0 337px; align-self: stretch; border-left: 1px solid #e9e6dd; background: #fffefa; overflow: auto; }.drawer-image { height: 209px; background-color: #dad6c8; background-position: center; background-size: cover; position: relative; }.drawer-image::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(19,34,25,.38), transparent 45%, rgba(19,34,25,.35)); pointer-events: none; }.drawer-image-top, .drawer-image-bottom { position: absolute; z-index: 1; left: 15px; right: 15px; display: flex; align-items: center; justify-content: space-between; }.drawer-image-top { top: 15px; }.drawer-image-bottom { bottom: 15px; color: rgba(255,255,255,.88); font-size: 10px; }.drawer-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 5px; color: #fff; background: rgba(25,40,31,.45); backdrop-filter: blur(6px); font-size: 9px; font-weight: 700; }.drawer-tag .live-dot { width: 5px; height: 5px; background: #aed19f; box-shadow: none; }.drawer-close { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: #fff; background: rgba(25,40,31,.45); backdrop-filter: blur(6px); }.drawer-close.light { color: #54645a; background: #f1eee5; }.drawer-action { display: grid; place-items: center; width: 29px; height: 29px; border: 0; border-radius: 7px; color: #fff; background: rgba(25,40,31,.35); }.drawer-content { padding: 22px 20px 34px; }.drawer-title-row { display: flex; justify-content: space-between; gap: 10px; }.drawer-title-row h2 { max-width: 255px; margin-top: 5px; color: #2f4036; font-family: 'DM Serif Display', Georgia, serif; font-size: 27px; font-weight: 400; letter-spacing: -.03em; line-height: 1.05; }.like-button { display: grid; place-items: center; width: 31px; height: 31px; flex: 0 0 31px; border: 1px solid #eae6dc; border-radius: 9px; color: #b9a99e; background: #fffcf5; }.like-button:hover { color: #d67d58; border-color: #e6c7b8; }.drawer-note { margin-top: 13px; color: #8b968e; font-size: 10px; line-height: 1.55; }.recipe-chip { display: flex; align-items: center; gap: 8px; margin-top: 15px; padding: 10px; border-radius: 9px; color: #927c61; background: #f4eddf; font-size: 9px; }.recipe-chip svg:first-child { color: #c58455; }.recipe-chip span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.recipe-chip svg:last-child { color: #b8a88e; }.rating-summary { display: flex; gap: 21px; margin-top: 23px; }.rating-number { min-width: 76px; }.rating-number strong { display: block; color: #394e40; font-family: 'DM Serif Display', Georgia, serif; font-size: 34px; font-weight: 400; line-height: .9; }.stars { display: flex; gap: 2px; margin-top: 8px; color: #d89b4f; }.rating-number > span { display: block; margin-top: 6px; color: #abb1aa; font-size: 8px; white-space: nowrap; }.rating-bars { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 4px; }.rating-bar-row { display: flex; align-items: center; gap: 6px; color: #a3aca4; font-size: 8px; }.rating-bar-row > span { width: 7px; }.bar-track { height: 4px; flex: 1; overflow: hidden; border-radius: 4px; background: #eeeae2; }.bar-fill { height: 100%; border-radius: inherit; background: #d99b55; }.rating-bar-row small { width: 8px; color: #a3aca4; font-size: 8px; text-align: right; }.rating-divider { height: 1px; margin: 22px 0 17px; background: #eeeae4; }.your-rating { padding: 13px; border: 1px solid #eee8dc; border-radius: 10px; background: #fcf7ec; }.your-rating > div:first-child { display: flex; flex-direction: column; gap: 4px; }.your-rating strong { color: #58675d; font-size: 10px; }.your-rating span { color: #a9afa8; font-size: 9px; }.rating-picker { display: flex; gap: 2px; margin-top: 11px; }.rating-picker button { padding: 0; border: 0; color: #d6d0c3; background: transparent; }.rating-picker button.chosen { color: #d99a50; }.save-rating { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 12px; padding: 8px; border: 0; border-radius: 7px; color: #fff9ef; background: #375747; font-size: 9px; font-weight: 700; }.save-rating:disabled { color: #adb4ab; background: #e4e4da; cursor: not-allowed; }.rated-by { margin-top: 22px; }.rated-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }.rated-heading strong { color: #59675e; font-size: 10px; }.rated-heading span { color: #aeb4ad; font-size: 9px; }.person-rating { display: flex; align-items: center; gap: 7px; padding: 8px 0; border-top: 1px solid #f1ede6; }.person-avatar { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 8px; color: #fff; font-size: 7px; font-weight: 700; }.person-name { flex: 1; color: #79857d; font-size: 9px; }.person-name small { margin-left: 3px; color: #c97751; font-size: 8px; }.person-stars { display: flex; gap: 0; color: #d99a50; }.person-rating > strong { color: #69766d; font-size: 9px; }
  .modal-backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(25,40,31,.48); backdrop-filter: blur(5px); }.add-modal { position: relative; margin: 0 auto; width: min(100%, 560px); max-height: calc(100vh - 40px); overflow: auto; padding: 25px 27px 22px; border-radius: 17px; background: #fffefa; box-shadow: 0 26px 70px rgba(25,40,31,.22); }.modal-header { display: flex; justify-content: space-between; gap: 20px; }.modal-header h2 { margin-top: 8px; color: #2f4036; font-family: 'DM Serif Display', Georgia, serif; font-size: 29px; font-weight: 400; letter-spacing: -.03em; }.modal-header p { margin-top: 6px; color: #989f98; font-size: 10px; }.modal-header .drawer-close { background: #f2eee5; }.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 23px; }.field { display: flex; flex-direction: column; gap: 7px; }.field.full { grid-column: 1 / -1; }.field > span { color: #647269; font-size: 10px; font-weight: 700; }.field > span i { color: #c87751; font-style: normal; }.field > span em { color: #b4bab2; font-size: 9px; font-style: normal; font-weight: 400; }.field input, .field textarea, .select-wrap { width: 100%; border: 1px solid #e7e4db; border-radius: 8px; outline: 0; color: #425349; background: #fcfbf7; font-size: 11px; transition: .2s ease; }.field input { height: 37px; padding: 0 11px; }.field textarea { resize: vertical; min-height: 78px; padding: 10px 11px; line-height: 1.5; }.field input:focus, .field textarea:focus, .select-wrap:focus-within { border-color: #d99a78; box-shadow: 0 0 0 3px rgba(217,154,120,.12); }.input-with-icon, .select-wrap { display: flex; align-items: center; position: relative; }.input-with-icon :global(svg) { margin-left: 10px; color: #b2b8b0; }.input-with-icon input { flex: 1; border: 0; }.select-wrap select { width: 100%; height: 35px; padding: 0 31px 0 11px; border: 0; outline: 0; appearance: none; color: #425349; background: transparent; font-size: 11px; }.select-wrap svg { position: absolute; right: 10px; color: #aeb5ad; pointer-events: none; }.upload-field { margin-top: 15px; }.upload-field input { display: none; }.upload-field label { display: flex; align-items: center; gap: 10px; min-height: 62px; padding: 9px 12px; border: 1px dashed #d9d5ca; border-radius: 9px; color: #a7aea7; background: #fdfbf6; cursor: pointer; }.upload-field label:hover { border-color: #d58c69; background: #fdf4ed; }.upload-icon { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 9px; color: #ca7b55; background: #f4e2d5; }.upload-field label > div:not(.upload-preview):not(.upload-icon) { display: flex; flex-direction: column; gap: 4px; }.upload-field strong { color: #67756b; font-size: 10px; }.upload-field span { color: #afb6af; font-size: 9px; }:global(.upload-arrow) { margin-left: auto; color: #aeb5ad; }.upload-preview { width: 49px; height: 42px; border-radius: 7px; background-position: center; background-size: cover; }.modal-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 21px; }.privacy-note { display: flex; align-items: center; gap: 6px; color: #a8afa8; font-size: 9px; }.modal-footer .primary-button { min-height: 36px; }.toast { position: fixed; z-index: 40; right: 25px; bottom: 25px; display: flex; align-items: center; gap: 9px; padding: 10px 14px 10px 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; color: #f5f1e7; background: #2e5140; box-shadow: 0 12px 32px rgba(29,49,40,.2); font-size: 10px; font-weight: 600; }.toast-check { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: #31523e; background: #d5e3cc; }.mobile-only { display: none; }
  @media (max-width: 1180px) { .detail-drawer { width: 310px; flex-basis: 310px; }.topbar { padding-left: 28px; padding-right: 28px; }.page-wrap { padding-left: 28px; padding-right: 28px; }.hero-card h2 { font-size: 33px; }.art-plate { right: 15px; }.archive-meals { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 930px) { .sidebar { width: 218px; flex-basis: 218px; }.detail-drawer { display: none; }.hero-grid { grid-template-columns: 1fr; }.stats-stack { grid-template-columns: repeat(3, 1fr); }.content-grid { grid-template-columns: 1fr; }.side-column { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }.side-column .section-heading { grid-column: 1 / -1; margin-bottom: 0; }.invite-card { margin-top: 0; } }
  @media (max-width: 680px) { .auth-shell { padding: 15px; }.auth-card-wide { grid-template-columns: 1fr; }.auth-visual { min-height: 270px; padding: 22px; }.auth-visual-copy { margin: 35px 0 0; }.auth-visual-copy h1 { font-size: 34px; }.auth-visual-copy p { display: none; }.auth-form-panel { padding: 30px 22px 27px; }.sidebar { position: fixed; inset: 0 auto 0 0; width: 256px; transform: translateX(-105%); transition: transform .25s ease; box-shadow: 16px 0 40px rgba(22,38,29,.15); }.sidebar.mobile-open { transform: translateX(0); }.mobile-only { display: grid; }.sidebar-close { display: grid; place-items: center; margin-left: auto; width: 28px; height: 28px; border: 0; color: #b9c8bc; background: transparent; }.mobile-menu { place-items: center; width: 32px; height: 32px; margin-right: 9px; padding: 0; border: 0; color: #627269; background: transparent; }.topbar { height: 65px; padding: 0 17px; }.breadcrumbs { flex: 1; }.topbar-actions { gap: 9px; }.search-box { width: 32px; height: 32px; padding: 0; justify-content: center; border: 0; background: transparent; }.search-box input { display: none; }.page-wrap { padding: 29px 17px 50px; }.page-heading { align-items: start; flex-direction: column; margin-bottom: 24px; }.page-heading .primary-button { width: 100%; }.hero-card { min-height: 345px; }.hero-copy { width: 100%; padding: 27px 23px; }.hero-copy p { max-width: 250px; }.hero-art { position: absolute; right: 0; bottom: 0; width: 52%; height: 48%; opacity: .78; }.art-blob { top: 22px; right: -11px; width: 175px; height: 175px; }.art-plate { top: 40px; right: 17px; width: 137px; height: 137px; }.art-food { top: 27px; left: 21px; width: 84px; height: 77px; }.art-garnish { transform: scale(.72) rotate(40deg); }.garnish-one { top: 28px; left: 71px; }.garnish-two { top: 87px; left: 34px; }.note-one { top: 13px; right: 5px; }.note-two { bottom: 12px; left: 0; }.stats-stack { grid-template-columns: 1fr 1fr; }.stat-card:last-child { grid-column: 1 / -1; }.content-grid { margin-top: 29px; }.side-column { grid-template-columns: 1fr; }.side-column .section-heading { margin-bottom: 0; }.invite-card { margin-top: 0; }.archive-meals { grid-template-columns: 1fr; }.view-toolbar { margin-bottom: 17px; }.top-intro { align-items: start; flex-direction: column; gap: 15px; }.top-summary { align-self: end; }.ranking-row { gap: 9px; padding: 13px 10px; }.ranking-image { width: 47px; height: 47px; flex-basis: 47px; }.rating-people { display: none; }.big-rating { min-width: 48px; font-size: 13px; }.ranking-copy p { display: none; }.add-modal { padding: 21px 18px 18px; }.form-grid { grid-template-columns: 1fr; }.field.full { grid-column: auto; }.modal-footer { align-items: end; flex-direction: column-reverse; gap: 15px; }.modal-footer .primary-button { width: 100%; }.privacy-note { align-self: start; }.toast { right: 16px; bottom: 16px; left: 16px; justify-content: center; } }
  .circle-row { display: flex; align-items: center; gap: 2px; }
  .circle-row .circle-item { flex: 1; min-width: 0; }
  .circle-item.active { color: #f6f0e6; background: rgba(255,255,255,.08); }
  .circle-manage { display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 7px; color: #71897a; background: transparent; opacity: .7; }
  .circle-manage:hover { color: #f1b98e; background: rgba(255,255,255,.08); opacity: 1; }
  .language-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 11px; border: 0; color: #879c90; background: transparent; font-size: 10px; }
  .language-toggle strong { padding: 3px 6px; border: 1px solid rgba(255,255,255,.12); border-radius: 5px; color: #f1b98e; font-size: 9px; }
  .recipe-editor { min-width: 0; padding: 14px; border: 1px solid #e7e4db; border-radius: 11px; background: #fbfaf6; }
  .recipe-editor.full { grid-column: 1 / -1; width: 100%; }
  .recipe-editor legend { padding: 0 5px; color: #526159; font-size: 11px; font-weight: 700; }
  .recipe-editor legend em { color: #aeb6ae; font-size: 9px; font-style: normal; font-weight: 400; }
  .recipe-editor-top { display: grid; grid-template-columns: 1fr 130px; gap: 10px; align-items: end; }
  .recipe-editor-top .field > span { min-height: 22px; display: flex; align-items: end; }
  .recipe-subheading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 15px 0 8px; color: #53645a; font-size: 10px; }
  .recipe-subheading > span { color: #9ca69d; font-size: 8px; }
  .recipe-category-list, .recipe-category-add, .recipe-link-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
  .recipe-category-list > span { display: inline-flex; align-items: center; gap: 3px; padding: 4px 7px; border: 1px solid #dce8dc; border-radius: 20px; color: #42634c; background: #eff5ef; font-size: 9px; }
  .recipe-category-list button, .recipe-remove { display: grid; place-items: center; border: 0; color: #87968a; background: transparent; cursor: pointer; }
  .recipe-category-list button:disabled, .recipe-remove:disabled { opacity: .35; cursor: not-allowed; }
  .recipe-category-add { margin-top: 8px; }
  .recipe-category-add input { max-width: 190px; }
  .recipe-ingredient-row { display: grid; grid-template-columns: minmax(90px, 1fr) 75px 92px minmax(85px, .8fr) 22px; align-items: center; gap: 6px; margin-top: 6px; }
  .recipe-ingredient-row input, .recipe-ingredient-row select, .recipe-step-row textarea, .recipe-category-add input, .recipe-viewer input { min-width: 0; min-height: 34px; padding: 7px 8px; border: 1px solid #e1e5dc; border-radius: 7px; outline: 0; color: #43554a; background: #fffefa; font: inherit; font-size: 9px; }
  .recipe-step-row { display: grid; grid-template-columns: 23px minmax(0, 1fr) 22px; align-items: start; gap: 7px; margin-top: 8px; }
  .recipe-step-number { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; background: #43865a; font-size: 9px; font-weight: 700; }
  .recipe-step-row textarea { width: 100%; min-height: 52px; resize: vertical; line-height: 1.45; }
  .recipe-link-row { margin: 5px 0 9px 30px; color: #849187; font-size: 8px; }
  .recipe-link-row button { padding: 4px 7px; border: 1px solid #dce8dc; border-radius: 16px; color: #42634c; background: #eff5ef; font-size: 8px; }
  .recipe-viewer { margin-top: 15px; padding: 13px; border: 1px solid #dce8dd; border-radius: 11px; color: #43554a; background: #f5f8f3; }
  .recipe-viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .recipe-viewer-head > div { display: flex; align-items: center; gap: 7px; color: #287344; }
  .recipe-viewer-head strong { font-size: 11px; }
  .recipe-viewer-head label { display: flex; align-items: center; gap: 6px; color: #718076; font-size: 9px; }
  .recipe-viewer input { width: 55px; min-height: 28px; }
  .recipe-unit-toggle { display: flex; gap: 3px; margin-top: 10px; padding: 3px; border-radius: 7px; background: #e9eee7; }
  .recipe-unit-toggle button { flex: 1; padding: 6px; border: 0; border-radius: 5px; color: #728076; background: transparent; font-size: 9px; }
  .recipe-unit-toggle button.active { color: #28613d; background: #fffefa; box-shadow: 0 1px 3px #24382a18; }
  .recipe-source { display: inline-block; margin-top: 8px; color: #287344; font-size: 9px; }
  .recipe-view-section { margin-top: 13px; }
  .recipe-view-section h3 { margin-bottom: 7px; color: #475a4b; font-size: 10px; }
  .recipe-view-category { margin-top: 8px; }
  .recipe-view-category > strong { display: block; margin-bottom: 3px; color: #779080; font-size: 8px; text-transform: uppercase; letter-spacing: .06em; }
  .recipe-view-category > div { padding: 4px 0; border-top: 1px solid #e6ece4; font-size: 9px; }
  .recipe-view-steps { display: grid; gap: 9px; padding: 0; list-style: none; }
  .recipe-view-steps li { display: grid; grid-template-columns: 20px 1fr; gap: 7px; }
  .recipe-view-steps li > span { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; color: #fff; background: #43865a; font-size: 8px; font-weight: 700; }
  .recipe-view-steps p { color: #5c6b60; font-size: 9px; line-height: 1.5; white-space: pre-wrap; }
  .filter-control { position: relative; }
  .filter-menu { position: absolute; z-index: 8; top: calc(100% + 8px); right: 0; display: grid; gap: 10px; width: 190px; padding: 13px; border: 1px solid #e7e4da; border-radius: 11px; background: #fffefa; box-shadow: 0 12px 30px rgba(42,57,48,.12); }
  .filter-menu label { display: grid; gap: 5px; }
  .filter-menu label span { color: #78867c; font-size: 9px; font-weight: 700; }
  .filter-menu select { height: 30px; padding: 0 7px; border: 1px solid #e4e0d7; border-radius: 6px; color: #526159; background: #fcfbf7; font-size: 10px; }
  .small-button { min-height: 31px; padding: 0 10px; font-size: 10px; }
  .drawer-menu-wrap { position: relative; }
  .drawer-menu { position: absolute; z-index: 3; right: 0; bottom: 36px; min-width: 125px; padding: 5px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: rgba(26,43,34,.92); box-shadow: 0 8px 22px rgba(0,0,0,.18); }
  .drawer-menu button { width: 100%; padding: 8px 9px; border: 0; border-radius: 5px; color: #fff2e8; background: transparent; font-size: 9px; text-align: left; }
  .drawer-menu button:hover { background: rgba(255,255,255,.1); }
  .like-button.liked { color: #d67d58; background: #fff1e9; }
  .modal-actions { display: flex; align-items: center; gap: 8px; }
  .danger-button { min-height: 36px; padding: 0 12px; border: 1px solid #edc4b5; border-radius: 8px; color: #b55f42; background: #fff7f2; font-size: 10px; font-weight: 700; }
  .danger-button:hover { background: #fce9df; }
  .color-picker { display: flex; align-items: center; gap: 10px; height: 37px; padding: 0 10px; border: 1px solid #e7e4db; border-radius: 8px; color: #89958c; background: #fcfbf7; font-size: 10px; }
  .color-picker input { width: 25px; height: 25px; padding: 0; border: 0; border-radius: 6px; background: transparent; }
  .circle-modal .modal-footer { align-items: center; }
  .invite-user-field { position: relative; }
  .invite-user-field > label { color: #647269; font-size: 10px; font-weight: 700; }
  .invite-user-field > label em { color: #b4bab2; font-size: 9px; font-style: normal; font-weight: 400; }
  .invite-suggestions { position: absolute; z-index: 5; top: calc(100% + 3px); right: 0; left: 0; margin: 0; padding: 4px; list-style: none; border: 1px solid #e7e4db; border-radius: 9px; background: #fffefa; box-shadow: 0 10px 24px rgba(35,52,42,.12); }
  .invite-suggestions button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 0; border-radius: 6px; text-align: left; color: #425349; background: transparent; cursor: pointer; font-size: 11px; }
  .invite-suggestions button:hover, .invite-suggestions button:focus-visible { outline: 0; background: #f3f5ef; }
  .invite-suggestions button span { overflow: hidden; color: #8b978e; text-overflow: ellipsis; white-space: nowrap; }
  .invite-no-results { position: absolute; z-index: 5; top: calc(100% + 3px); right: 0; left: 0; padding: 10px; border: 1px solid #e7e4db; border-radius: 9px; color: #78867c; background: #fffefa; box-shadow: 0 10px 24px rgba(35,52,42,.12); font-size: 10px; }
  .circle-members { display: grid; gap: 5px; margin-top: 18px; padding-top: 13px; border-top: 1px solid #e9e7df; }
  .members-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; color: #526159; font-size: 10px; }
  .members-heading span { color: #9aa49c; font-size: 9px; }
  .members-empty { padding: 8px 0; color: #87938a; font-size: 10px; }
  .circle-member-row { display: flex; align-items: center; gap: 9px; min-height: 38px; padding: 5px 7px; border-radius: 8px; background: #f7f8f3; }
  .member-avatar { display: grid; place-items: center; width: 27px; height: 27px; flex: 0 0 27px; border-radius: 50%; color: #286340; background: #e2efe4; font-size: 10px; font-weight: 700; }
  .member-copy { display: grid; flex: 1; min-width: 0; gap: 2px; }
  .member-copy strong { overflow: hidden; color: #425349; font-size: 10px; text-overflow: ellipsis; }
  .member-copy small { overflow: hidden; color: #939d95; font-size: 9px; text-overflow: ellipsis; }
  .admin-badge { padding: 3px 6px; border-radius: 999px; color: #286340; background: #e7f2e9; font-size: 8px; font-weight: 700; }
  .member-remove { padding: 5px 7px; border: 1px solid #edc4b5; border-radius: 6px; color: #b55f42; background: #fff7f2; font-size: 8px; }
  .member-remove:disabled { opacity: .55; }
  dialog.add-modal { margin: 0; border: 0; }

  .sidebar { position: sticky; top: 0; height: 100vh; max-height: 100vh; overflow: hidden; }
  .circle-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .sidebar-bottom { flex: 0 0 auto; }
  :global(button:focus-visible), :global(input:focus-visible), :global(textarea:focus-visible), :global(select:focus-visible) { outline-color: rgba(72, 168, 104, .35); }
  .rating-picker { display: flex; align-items: center; gap: 3px; margin-top: 11px; }
  .rating-star { position: relative; display: block; width: 23px; height: 27px; }
  .rating-star .star-half { position: absolute; top: 1px; display: block; width: 12px; height: 24px; overflow: hidden; padding: 1px 0; border: 0; color: #b7c1b8; background: transparent; }
  .rating-star .star-half:first-child { left: 0; }
  .rating-star .star-half:last-child { right: 0; }
  .rating-star .star-half:last-child :global(svg) { transform: translateX(-11px); }
  .rating-star .star-half.chosen { color: #48a868; }
  .stars, .person-stars, .row-rating, .top-score { color: #48a868; }
  .stars :global(svg.half), .person-stars :global(svg.half) { clip-path: inset(0 50% 0 0); }
  .auth-switch, .text-button, .quiet-button { color: #287344; }
  .auth-switch:hover, .text-button:hover, .quiet-button:hover, .meal-row:hover .meal-row-copy strong, .top-meal:hover .top-copy strong { color: #1f5f38; }
  .filter-pill.active { border-color: #b7d6bc; color: #287344; background: #e7f2e9; }
  .archive-rating, .big-rating, .ranking-title { color: #287344; }
  .ranking-number.gold { color: #48a868; }
  .like-button.liked { color: #287344; background: #e7f2e9; }
  .year-pill { color: #287344; background: #e7f2e9; }
  .recipe-chip :global(svg:first-child), .upload-icon :global(svg) { color: #48a868; }
  .recipe-chip { color: #43584a; background: #e8efe7; }
  .meal-dietary-tags, .dietary-options { display: flex; flex-wrap: wrap; gap: 7px; }
  .meal-dietary-tags { margin-top: 12px; }
  .dietary-tag { padding: 5px 8px; border: 1px solid #d5e5d7; border-radius: 999px; color: #286340; background: #edf5ee; font-size: 9px; font-weight: 600; }
  .dietary-field { min-width: 0; padding: 0; border: 0; }
  .dietary-field legend { margin-bottom: 8px; color: #53645a; font-size: 10px; font-weight: 700; }
  .dietary-field small { display: block; margin-top: 8px; color: #8d9990; font-size: 9px; line-height: 1.4; }
  .dietary-option { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid #e3e9e2; border-radius: 7px; color: #68766d; background: #f9fbf8; font-size: 9px; cursor: pointer; }
  .dietary-option.active { border-color: #9dc9a5; color: #245c36; background: #eaf4eb; }
  .dietary-option input { width: 13px; height: 13px; margin: 0; accent-color: #287344; }
  .drawer-menu { min-width: 145px; }
  .drawer-menu button + button { color: #ffd7cc; }
  .art-note, .note-one, .note-two { display: none; }
  .live-dot { background: #48a868; box-shadow: 0 0 0 3px rgba(72,168,104,.12); }
  .hero-card h2 em, .invite-icon { color: #287344; }
  .stat-terracotta { color: #315940; background: #deebdf; }
  .invite-icon { background: #e7f2e9; }

  .profile-avatar { overflow: hidden; cursor: pointer; }
  .profile-avatar img, .top-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .profile-avatar input { display: none; }
  .brand-mark { background: #78c990; }
  .profile-avatar, .top-avatar { background: #78c990; color: #102519; }
  .nav-item.active { background: #78c990; color: #102519; }
  .auth-visual-copy h1 em, .auth-visual-note span { color: #78c990; }
  .eyebrow, .field > span i, .person-name small { color: #4a9b62; }
  .primary-button, .save-rating { background: #287344; }
  .primary-button:hover, .save-rating:hover { background: #1f5f38; }

  /* RateMyPlate uses a restrained green/ink palette. Keep the decorative
     illustration styles above for backwards-compatible markup, but leave the
     product surface quiet and content-first. */
  .hero-art { display: none; }
  .hero-card { min-height: 232px; background: #e6f1e8; }
  .hero-copy { width: 100%; }
  .hero-card h2 { color: #102519; }
  .hero-card h2 em { color: #287344; }
  .hero-card p { color: #4f6c58; }
  .hero-kicker, .eyebrow, .text-button, .quiet-button { color: #287344; }
  .stat-cream { color: #173525; background: #e7f0e8; }
  .stat-sage { color: #1d4b2c; background: #d6ead9; }
  .stat-terracotta { color: #173525; background: #cfe3d2; }
  .filter-pill.active { border-color: #9dccaa; color: #287344; background: #e7f2e9; }
  .year-pill { color: #287344; background: #e7f2e9; }
  .archive-rating, .big-rating, .ranking-title, .stars, .person-stars, .row-rating, .top-score { color: #287344; }
  .notification-button span { background: #48a868; }
  .upload-field label:hover { border-color: #72b984; background: #eef8ef; }
  .like-button:hover { color: #287344; border-color: #9dccaa; }
  .top-meal:hover .top-copy strong, .meal-row:hover .meal-row-copy strong { color: #1f5f38; }
  .bar-fill { background: #48a868; }
  .rating-picker button { color: #b7c1b8; }
  .rating-picker button.chosen { color: #48a868; }
  .circle-manage:hover, .language-toggle strong { color: #78c990; }
  .ranking-title { color: #287344; }
  .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .card-tags span { padding: 3px 6px; border: 1px solid #d5e5d7; border-radius: 999px; color: #286340; background: #edf5ee; font-size: 8px; font-weight: 700; line-height: 1; }
  .card-tags.compact { margin-top: 3px; }
  .card-tags.compact span { padding: 2px 5px; font-size: 7px; }
  .archive-heart { cursor: pointer; }
  .review-field { display: grid; gap: 6px; margin-top: 12px; }
  .review-field span { color: #6d7b71; font-size: 9px; font-weight: 700; }
  .review-field textarea { width: 100%; resize: vertical; min-height: 58px; padding: 8px 9px; border: 1px solid #dce6dd; border-radius: 8px; outline: 0; color: #425349; background: #f9fbf8; font-size: 10px; line-height: 1.45; }
  .review-field textarea:focus { border-color: #72b984; box-shadow: 0 0 0 3px rgba(72, 168, 104, .12); }
  .person-rating { flex-wrap: wrap; }
  .person-review { flex-basis: 100%; margin: 1px 0 2px 32px; color: #6d7b71; font-size: 9px; line-height: 1.45; }
  .notification-wrap { position: relative; }
  .notification-button span { display: grid; place-items: center; min-width: 15px; height: 15px; padding: 0 3px; border: 0; border-radius: 999px; color: #fff; background: #287344; font-size: 7px; font-weight: 700; }
  .notification-menu { position: absolute; z-index: 20; top: calc(100% + 10px); right: 0; width: min(320px, calc(100vw - 34px)); padding: 10px; border: 1px solid #dfe8df; border-radius: 12px; background: #fffefa; box-shadow: 0 15px 35px rgba(27, 56, 36, .16); }
  .notification-menu-heading { display: flex; align-items: center; justify-content: space-between; padding: 3px 5px 8px; border-bottom: 1px solid #edf1ed; }
  .notification-menu-heading strong { color: #24392b; font-size: 11px; }
  .notification-menu-heading button { padding: 0; border: 0; color: #287344; background: transparent; font-size: 8px; font-weight: 700; }
  .notification-item { display: flex; align-items: flex-start; gap: 9px; width: 100%; padding: 9px 5px; border: 0; border-bottom: 1px solid #f0f3f0; color: inherit; background: transparent; text-align: left; }
  .notification-item:last-child { border-bottom: 0; }
  .notification-item.unread { background: #f0f8f1; }
  .notification-icon { display: grid; place-items: center; width: 26px; height: 26px; flex: 0 0 26px; border-radius: 8px; color: #287344; background: #dff0e2; }
  .notification-item > span:last-child { display: grid; gap: 3px; }
  .notification-item strong { color: #405448; font-size: 9px; font-weight: 700; }
  .notification-item small, .notification-empty { color: #91a096; font-size: 8px; }
  .notification-empty { margin: 12px 5px 8px; }

  @media (prefers-color-scheme: dark) {
    :global(html) { color-scheme: dark; }
    :global(body) { color: #e7eee9; background: #111a16; }
    .auth-shell, .main-content { background: #111a16; }
    .auth-card, .auth-form-panel { background: #1a2720; }
    .auth-visual { background: #1e382b; }
    .auth-form-heading h2, .modal-header h2, .drawer-title-row h2, .section-heading h2, .archive-heading h2, .ranking-title strong, h1 { color: #edf3ee; }
    .auth-form-heading p, .page-heading p, .drawer-note, .archive-card-content p, .ranking-copy p { color: #9eaea3; }
    .field input, .field textarea, .select-wrap, .color-picker, .filter-menu, .add-modal { color: #e8f0ea; background: #1b2821; border-color: #34463b; }
    .recipe-editor { border-color: #34463b; color: #d5e2d8; background: #1b2821; }
    .recipe-editor legend, .recipe-subheading { color: #c3d0c6; }
    .recipe-category-list > span, .recipe-link-row button { border-color: #355642; color: #c5dec9; background: #22392a; }
    .recipe-ingredient-row input, .recipe-ingredient-row select, .recipe-step-row textarea, .recipe-category-add input, .recipe-viewer input { border-color: #34463b; color: #e3ece5; background: #17221c; }
    .recipe-viewer { border-color: #344c39; color: #d5e2d8; background: #1b2a21; }
    .recipe-viewer-head label, .recipe-view-section h3, .recipe-view-steps p { color: #bdcdbf; }
    .recipe-unit-toggle { background: #22352a; }
    .recipe-unit-toggle button.active { color: #c8ebd0; background: #304d38; }
    .recipe-view-category > div { border-color: #34463b; }
    .field input, .field textarea, .select-wrap select, .color-picker span, .filter-menu select { color: #e8f0ea; background: transparent; }
    .field > span, .filter-menu label span, .drawer-note, .person-name, .top-copy strong, .meal-row-copy strong, .archive-title-row h3 { color: #c3d0c6; }
    .field input::placeholder, .field textarea::placeholder, .search-box input::placeholder { color: #718278; }
    .topbar { border-color: #293a30; background: rgba(17,26,22,.88); }
    .search-box, .circle-icon-button, .timeline-card, .top-card, .top-intro, .ranking-list, .archive-card { border-color: #293a30; background: #18231d; }
    .search-box input, .breadcrumbs strong, .meal-row-copy span, .archive-meta, .ranking-copy span, .top-copy span, .archive-count, .group-heading .month-label { color: #a7b5aa; }
    .group-line, .meal-row, .timeline-group + .timeline-group, .top-meal, .ranking-row, .person-rating, .rating-divider { border-color: #2c3a31; }
    .meal-row:hover, .ranking-row:hover { background: #202e26; }
    .hero-card { background: #294234; }
    .hero-card h2 { color: #e8f2e9; }
    .hero-card p, .hero-kicker { color: #aec3b2; }
    .art-plate { border-color: #dfe8d8; background: #c9d6c5; }
    .stat-cream { color: #d1e5d3; background: #263f30; }
    .stat-sage { color: #d1e5d3; background: #2d4737; }
    .stat-terracotta { color: #d1e5d3; background: #2d4737; }
    .filter-pill { border-color: #34463b; color: #a7b5aa; }
    .filter-pill.active { border-color: #4a9b62; color: #b8e3c2; background: #203b2a; }
    .empty-state { border-color: #34463b; color: #8fa195; }
    .empty-state h3 { color: #d8e5da; }
    .your-rating { border-color: #35523d; background: #20352a; }
    .your-rating strong, .rated-heading strong { color: #e0e8df; }
    .your-rating span, .rated-heading span, .rating-number > span { color: #a4b0a5; }
    .bar-track { background: #354237; }
    .recipe-chip { color: #d3e2d6; background: #263a2d; border: 1px solid #385440; }
    .recipe-chip :global(svg:first-child) { color: #81ca91; }
    .dietary-field legend { color: #c7d7ca; }
    .dietary-field small { color: #91a397; }
    .dietary-tag { border-color: #385742; color: #c3e3c9; background: #263a2d; }
    .dietary-option { border-color: #394b3e; color: #c1d0c4; background: #1b2821; }
    .dietary-option.active { border-color: #4a9b62; color: #c8e8ce; background: #203b2a; }
    .like-button { border-color: #34463b; color: #abb9ad; background: #1f2d25; }
    .invite-card { border-color: #46564a; }
    .invite-card strong { color: #ccd8ce; }
    .invite-card p { color: #94a398; }
    .modal-header p, .privacy-note { color: #9eaea3; }
    .modal-header .drawer-close { color: #d6e0d7; background: #2a3a30; }
    .upload-field label { border-color: #526356; color: #a3b2a7; background: #1b2821; }
    .upload-field strong { color: #d1ddd4; }
    .toast { background: #427053; }
    .detail-drawer { border-color: #2c3a31; background: #15221a; }
    .drawer-title-row h2, .rating-number strong, .rated-heading strong { color: #edf3ee; }
    .drawer-note, .your-rating span, .rated-heading span, .rating-number > span, .person-name { color: #9eaea3; }
    .rating-bars, .rating-bar-row, .rating-bar-row small { color: #a7b5aa; }
    .rating-divider, .person-rating { border-color: #2c3a31; }
    .rating-picker .star-half { color: #67806e; }
    .rating-picker .star-half.chosen { color: #73c98c; }
    .like-button { border-color: #34463b; color: #abb9ad; background: #1f2d25; }
    .drawer-menu { background: rgba(12, 25, 18, .96); }
    .card-tags span { border-color: #385742; color: #c3e3c9; background: #263a2d; }
    .review-field span { color: #c3d0c6; }
    .review-field textarea { border-color: #394b3e; color: #e8f0ea; background: #1b2821; }
    .person-review { color: #a4b0a5; }
    .notification-menu { border-color: #34463b; background: #18231d; }
    .notification-menu-heading { border-color: #2c3a31; }
    .notification-menu-heading strong, .notification-item strong { color: #e0e8df; }
    .notification-item { border-color: #2c3a31; }
    .notification-item.unread { background: #203b2a; }
    .notification-empty, .notification-item small { color: #9eaea3; }
    .circle-members { border-color: #34463b; }
    .members-heading, .member-copy strong { color: #d6e2d8; }
    .members-heading span, .members-empty, .member-copy small { color: #94a398; }
    .circle-member-row { background: #202f26; }
    .member-avatar { color: #bde5c5; background: #294a34; }
    .admin-badge { color: #c3e8cb; background: #294832; }
    .member-remove { border-color: #69483b; color: #ffc4ad; background: #38271f; }
    .danger-button { border-color: #69483b; color: #ffc4ad; background: #38271f; }
    .danger-button:hover { background: #493027; }
    .invite-suggestions { border-color: #34463b; background: #202e26; box-shadow: 0 10px 24px rgba(0,0,0,.35); }
    .invite-suggestions button { color: #d6e2d8; }
    .invite-suggestions button:hover, .invite-suggestions button:focus-visible { background: #2b3b31; }
    .invite-suggestions button span { color: #a0afa4; }
    .invite-no-results { border: 1px solid #34463b; border-radius: 9px; color: #a6b5aa; background: #202e26; }
  }

  @media (max-width: 680px) {
    .sidebar { position: fixed; }
    .detail-drawer {
      display: block;
      position: fixed;
      z-index: 25;
      inset: 65px 0 0;
      width: 100%;
      flex: none;
      border-top: 1px solid #e7e3d9;
      border-left: 0;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -16px 42px rgba(26, 43, 34, .16);
      -webkit-overflow-scrolling: touch;
    }
    .drawer-image { height: 220px; }
    .drawer-content { padding: 20px 18px 42px; }
    .drawer-title-row h2 { max-width: calc(100vw - 95px); font-size: 30px; }
    .rating-summary { gap: 14px; }
    .rating-number { min-width: 72px; }
    .filter-pills { overflow-x: auto; max-width: 62vw; padding-bottom: 2px; }
    .filter-pill { flex: 0 0 auto; }
    .view-toolbar { align-items: start; gap: 8px; }
    .filter-menu { right: 0; width: min(190px, calc(100vw - 34px)); }
    .modal-backdrop { align-items: end; padding: 8px; }
    .add-modal { width: 100%; max-height: calc(100vh - 16px); border-radius: 18px 18px 12px 12px; }
    .modal-backdrop { width: 100%; overflow-x: hidden; }
    .add-modal { min-width: 0; }
    .form-grid, .recipe-editor, .recipe-ingredient-row, .recipe-step-row { min-width: 0; }
    .recipe-subheading { min-width: 0; }
    .recipe-subheading > span { max-width: 50%; text-align: right; }
    .circle-modal .modal-footer { align-items: stretch; }
    .modal-actions { width: 100%; }
    .modal-actions .primary-button, .modal-actions .danger-button { flex: 1; }
    .archive-card { width: 100%; }
    .side-column { gap: 18px; }
    .topbar-actions { min-width: 0; }
    .page-heading h1 { max-width: 100%; }
    .hero-card { min-height: 250px; }
    .hero-copy { padding: 25px 22px; }
    .recipe-editor-top { grid-template-columns: 1fr; }
    .recipe-editor.full { grid-column: 1 / -1; }
    .recipe-ingredient-row { grid-template-columns: minmax(0, 1fr) minmax(58px, .55fr) minmax(75px, .7fr) 22px; }
    .recipe-ingredient-row select { grid-column: 1 / 4; }
  }
  .input-with-icon { height: 37px; gap: 8px; padding: 0 10px; border: 1px solid #e7e4db; border-radius: 8px; background: #fcfbf7; transition: .2s ease; }
  .input-with-icon :global(svg) { flex: 0 0 auto; margin: 0; color: #8f9b91; }
  .input-with-icon input { min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; background: transparent; box-shadow: none; }
  .input-with-icon input:focus { border: 0; box-shadow: none; }
  .input-with-icon:focus-within { border-color: #d99a78; box-shadow: 0 0 0 3px rgba(217,154,120,.12); }
  .upload-field { margin-top: 19px; }
  .upload-field label { min-height: 78px; gap: 13px; padding: 13px 14px; border-color: #d9d5ca; color: #7a897f; background: #fdfbf6; }
  .upload-field label:hover { border-color: #d58c69; background: #fdf4ed; }
  .upload-icon { width: 44px; height: 44px; flex: 0 0 44px; border-radius: 12px; color: #b96b48; background: #f4e2d5; }
  .upload-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; gap: 4px; }
  .upload-copy strong { color: #46584d; font-size: 12px; line-height: 1.3; }
  .upload-copy span { min-width: 0; color: #87948a; font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
  .upload-preview { width: 56px; height: 52px; flex: 0 0 56px; border: 1px solid #e3dfd5; border-radius: 9px; }
  :global(.upload-arrow) { flex: 0 0 auto; margin-left: auto; color: #849388; }

  @media (prefers-color-scheme: dark) {
    .input-with-icon { border-color: #34463b; background: #1b2821; }
    .input-with-icon :global(svg) { color: #97aa9b; }
    .input-with-icon input[type='date'] { color-scheme: dark; }
    .upload-field label { border-color: #3b5945; color: #a4b4a8; background: #1b2921; }
    .upload-field label:hover { border-color: #5d9d69; background: #21372a; }
    .upload-icon { color: #a7d6ad; background: #2b4533; }
    .upload-copy strong { color: #d6e3d8; }
    .upload-copy span { color: #9eafa2; }
    .upload-preview { border-color: #405b48; }
    :global(.upload-arrow) { color: #a1b2a5; }
  }

  @media (max-width: 680px) {
    :global(html), :global(body) {
      width: 100%;
      height: 100%;
      overflow: hidden;
      overscroll-behavior: none;
    }

    .app-shell {
      height: 100vh;
      height: 100dvh;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar {
      z-index: 32;
      inset: 0 auto 0 0;
      height: 100vh;
      height: 100dvh;
      max-height: 100dvh;
      padding-top: calc(27px + env(safe-area-inset-top));
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }

    .mobile-nav-scrim {
      position: fixed;
      z-index: 31;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      background: rgba(5, 13, 8, .44);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    .main-content {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      position: sticky;
      z-index: 18;
      top: 0;
      flex: 0 0 auto;
      height: calc(65px + env(safe-area-inset-top));
      padding: env(safe-area-inset-top) 17px 0;
    }

    .topbar.mobile-search-open {
      height: calc(65px + env(safe-area-inset-top));
      align-items: center;
      gap: 0;
    }

    .topbar.mobile-search-open .mobile-menu,
    .topbar.mobile-search-open .breadcrumbs { display: none; }
    .topbar.mobile-search-open .topbar-actions { width: 100%; flex: 1 1 auto; gap: 8px; }
    .topbar.mobile-search-open .notification-wrap,
    .topbar.mobile-search-open .top-avatar { display: none; }
    .topbar.mobile-search-open .mobile-search-trigger { width: 34px; height: 38px; flex-basis: 34px; border: 1px solid transparent; border-radius: 10px; }

    .page-wrap {
      min-height: 0;
      flex: 1 1 auto;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      padding-bottom: calc(50px + env(safe-area-inset-bottom));
    }

    .breadcrumbs { min-width: 0; overflow: hidden; white-space: nowrap; }
    .breadcrumbs span, .breadcrumbs :global(svg) { flex: 0 0 auto; }
    .breadcrumbs strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .topbar-actions { position: static; flex: 0 0 auto; gap: 9px; }
    .mobile-search-trigger { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; padding: 0; border: 0; border-radius: 8px; color: #627269; background: transparent; }
    .search-box { display: none; }
    .search-box.mobile-open { position: static; z-index: auto; display: flex; width: auto; min-width: 0; height: 40px; flex: 1 1 auto; padding: 0 12px; border-color: #dce4dc; background: #fffefa; }
    .search-box.mobile-open input { display: block; width: 100%; font-size: 12px; }
    .search-box.mobile-open :global(.search-icon) { flex: 0 0 auto; width: 15px; height: 15px; }
    .notification-wrap { z-index: 25; }
    .notification-menu { position: fixed; z-index: 45; top: calc(65px + env(safe-area-inset-top) + 8px); right: auto; left: 50%; width: min(320px, calc(100vw - 28px)); max-height: calc(100dvh - 90px); overflow-y: auto; overscroll-behavior: contain; transform: translateX(-50%); }
    .view-toolbar { align-items: center; gap: 8px; }
    .filter-pills { min-width: 0; max-width: calc(100vw - 120px); align-items: center; gap: 4px; padding-bottom: 0; }
    .filter-pill { height: 34px; gap: 4px; padding: 0 5px; font-size: 9px; white-space: nowrap; }
    .filter-pill :global(svg) { width: 13px; height: 13px; }
    .filter-control { align-self: center; flex: 0 0 auto; }
    .filter-control > .quiet-button { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 5px; padding: 0 8px; border: 1px solid #e5e2d9; border-radius: 8px; line-height: 1; }

    @media (prefers-color-scheme: dark) {
      .mobile-search-trigger { color: #a7b5aa; }
      .topbar.mobile-search-open .mobile-search-trigger { color: #d0dbd1; }
      .search-box.mobile-open { border-color: #34463b; background: #1b2821; }
    }
  }
</style>
