import * as Appwrite from 'appwrite';
import type { Models } from 'appwrite';
import type { AppNotification, Circle, CircleMember, Meal, Rating, UserProfile } from '$lib/types';

const { Account, Client, ID, Query, Storage, TablesDB, Teams } = Appwrite;

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string | undefined;
const mealsTableId = import.meta.env.VITE_APPWRITE_MEALS_TABLE_ID as string | undefined;
const ratingsTableId = import.meta.env.VITE_APPWRITE_RATINGS_TABLE_ID as string | undefined;
const circlesTableId = import.meta.env.VITE_APPWRITE_CIRCLES_TABLE_ID as string | undefined;
const profilesTableId = import.meta.env.VITE_APPWRITE_PROFILES_TABLE_ID as string | undefined;
const notificationsTableId = import.meta.env.VITE_APPWRITE_NOTIFICATIONS_TABLE_ID as string | undefined;
const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID as string | undefined;

export const appEnvironment =
  (import.meta.env.VITE_APP_ENV as string | undefined) ?? import.meta.env.MODE;

/** Auth can be used as soon as the endpoint and project are configured. */
export const appwriteConfigured = Boolean(endpoint && projectId);
/** Data calls are enabled once the TablesDB schema is configured too. */
export const dataConfigured = Boolean(endpoint && projectId && databaseId && mealsTableId && ratingsTableId);
export const circlesConfigured = Boolean(endpoint && projectId && databaseId && circlesTableId);
export const profilesConfigured = Boolean(endpoint && projectId && databaseId && profilesTableId);
export const notificationsConfigured = Boolean(endpoint && projectId && databaseId && notificationsTableId);

const client = new Client();
if (endpoint && projectId) client.setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const teams = new Teams(client);

function mealPermissions(ownerId: string, groupTeamId?: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId)),
    ...(groupTeamId ? [Appwrite.Permission.read(Appwrite.Role.team(groupTeamId))] : [])
  ];
}

function groupPermissions(ownerId: string, groupTeamId: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.read(Appwrite.Role.team(groupTeamId))
  ];
}

function mealPermissionsForMembers(ownerId: string, groupTeamId?: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId)),
    ...(groupTeamId ? [Appwrite.Permission.read(Appwrite.Role.team(groupTeamId))] : [])
  ];
}

function ratingPermissions(ownerId: string, groupTeamId?: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId)),
    ...(groupTeamId ? [Appwrite.Permission.read(Appwrite.Role.team(groupTeamId))] : [])
  ];
}

function ratingPermissionsForMembers(ownerId: string, groupTeamId?: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId)),
    ...(groupTeamId ? [Appwrite.Permission.read(Appwrite.Role.team(groupTeamId))] : [])
  ];
}

type MealRow = Models.Row & {
  name: string;
  date: string;
  recipe?: string;
  note: string;
  circle: string;
  imageId?: string;
  addedBy: string;
  ownerId: string;
  dietaryTags?: string[];
};

type RatingRow = Models.Row & {
  mealId: string;
  value: number;
  valueHalf?: number;
  name: string;
  initials: string;
  color: string;
  ownerId: string;
  review?: string;
};

type CircleRow = Models.Row & {
  name: string;
  color: string;
  ownerId: string;
  memberIds?: string[];
};

type ProfileRow = Models.Row & {
  userId: string;
  username: string;
  displayName: string;
};

type NotificationRow = Models.Row & {
  recipientId: string;
  type: 'group-invite';
  senderId: string;
  senderName: string;
  circleId: string;
  circleName: string;
  membershipId?: string;
  read: boolean;
};

export async function getCurrentUser() {
  if (!appwriteConfigured) return null;
  try {
    return await account.get();
  } catch {
    return null;
  }
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function usernameFromIdentity(name: string, email: string, userId: string) {
  return normalizeUsername(email.split('@')[0] || name.split(/\s+/)[0] || `user-${userId.slice(-6)}`)
    || `user-${userId.slice(-6)}`;
}

function profilePermissions(userId: string) {
  return [
    Appwrite.Permission.read(Appwrite.Role.users()),
    Appwrite.Permission.update(Appwrite.Role.user(userId)),
    Appwrite.Permission.delete(Appwrite.Role.user(userId))
  ];
}

function mapProfile(row: ProfileRow): UserProfile {
  // Keep the explicit userId field for the current Profiles table schema.
  return { id: row.$id, userId: row.$id, username: row.username, displayName: row.displayName };
}

export async function ensureAppwriteProfile(userId: string, displayName: string, requestedUsername?: string, email = '') {
  if (!profilesConfigured || !databaseId || !profilesTableId) {
    if (import.meta.env.DEV) console.warn('Profile setup is missing an Appwrite profile table configuration.');
    return null;
  }
  const fallback = usernameFromIdentity(displayName, email, userId);
  const requested = normalizeUsername(requestedUsername ?? '');
  try {
    const existing = await tablesDB.getRow<ProfileRow>({ databaseId, tableId: profilesTableId, rowId: userId });
    if (!requested || requested === existing.username) return mapProfile(existing);
    const conflict = await tablesDB.listRows<ProfileRow>({
      databaseId,
      tableId: profilesTableId,
      queries: [Query.equal('username', requested), Query.limit(1)]
    });
    if (conflict.rows.some((row) => row.$id !== userId)) return mapProfile(existing);
    return mapProfile(await tablesDB.updateRow<ProfileRow>({
      databaseId,
      tableId: profilesTableId,
      rowId: userId,
      data: { username: requested, displayName },
      permissions: profilePermissions(userId)
    }));
  } catch {
    let username = requested || fallback;
    const existing = await tablesDB.listRows<ProfileRow>({
      databaseId,
      tableId: profilesTableId,
      queries: [Query.equal('username', username), Query.limit(1)]
    }).catch(() => ({ rows: [] as ProfileRow[] }));
    if (existing.rows.length) username = `${username}-${userId.slice(-4)}`;
    try {
      return mapProfile(await tablesDB.createRow<ProfileRow>({
        databaseId,
        tableId: profilesTableId,
        rowId: userId,
        data: { userId, username, displayName },
        permissions: profilePermissions(userId)
      }));
    } catch (error) {
      console.error('Unable to create the signed-in user profile row.', error);
      throw error;
    }
  }
}

export async function findAppwriteProfile(username: string) {
  if (!profilesConfigured || !databaseId || !profilesTableId) return null;
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  const response = await tablesDB.listRows<ProfileRow>({
    databaseId,
    tableId: profilesTableId,
    queries: [Query.equal('username', normalized), Query.limit(1)]
  });
  return response.rows[0] ? mapProfile(response.rows[0]) : null;
}

export async function searchAppwriteProfiles(username: string, limit = 8) {
  if (!profilesConfigured || !databaseId || !profilesTableId) return [];
  const normalized = normalizeUsername(username);
  if (!normalized) return [];
  try {
    const response = await tablesDB.listRows<ProfileRow>({
      databaseId,
      tableId: profilesTableId,
      queries: [Query.startsWith('username', normalized), Query.limit(limit)]
    });
    return response.rows.map(mapProfile).sort((a, b) => a.username.localeCompare(b.username));
  } catch (prefixError) {
    // A prefix index may not exist on older profile tables. Fall back to a
    // bounded authenticated profile listing and filter locally so suggestions
    // keep working while the table is being migrated.
    let response;
    try {
      response = await tablesDB.listRows<ProfileRow>({
        databaseId,
        tableId: profilesTableId,
        queries: [Query.limit(100)]
      });
    } catch (listError) {
      console.error('Unable to list user profiles for invite suggestions.', { prefixError, listError });
      throw listError;
    }
    return response.rows
      .filter((row) => row.username.toLowerCase().startsWith(normalized))
      .map(mapProfile)
      .sort((a, b) => a.username.localeCompare(b.username))
      .slice(0, limit);
  }
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.$id,
    recipientId: row.recipientId,
    type: row.type,
    senderId: row.senderId,
    senderName: row.senderName,
    circleId: row.circleId,
    circleName: row.circleName,
    membershipId: row.membershipId,
    read: Boolean(row.read),
    createdAt: row.$createdAt
  };
}

export async function listAppwriteNotifications(userId: string) {
  if (!notificationsConfigured || !databaseId || !notificationsTableId) return [];
  const response = await tablesDB.listRows<NotificationRow>({
    databaseId,
    tableId: notificationsTableId,
    queries: [Query.equal('recipientId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]
  });
  return response.rows.map(mapNotification);
}

export async function markAppwriteNotificationRead(notificationId: string, userId: string) {
  if (!notificationsConfigured || !databaseId || !notificationsTableId) return null;
  return tablesDB.updateRow<NotificationRow>({
    databaseId,
    tableId: notificationsTableId,
    rowId: notificationId,
    data: { read: true },
    permissions: [
      Appwrite.Permission.read(Appwrite.Role.user(userId)),
      Appwrite.Permission.update(Appwrite.Role.user(userId)),
      Appwrite.Permission.delete(Appwrite.Role.user(userId))
    ]
  });
}

async function createAppwriteNotification(notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  if (!notificationsConfigured || !databaseId || !notificationsTableId) return null;
  return tablesDB.createRow<NotificationRow>({
    databaseId,
    tableId: notificationsTableId,
    rowId: ID.unique(),
    data: { ...notification, read: false },
    permissions: [
      Appwrite.Permission.read(Appwrite.Role.user(notification.recipientId)),
      Appwrite.Permission.read(Appwrite.Role.user(notification.senderId)),
      Appwrite.Permission.update(Appwrite.Role.user(notification.recipientId)),
      Appwrite.Permission.delete(Appwrite.Role.user(notification.recipientId))
    ]
  });
}

export async function registerWithEmail(email: string, password: string, name: string) {
  if (!appwriteConfigured) return null;
  await account.create(ID.unique(), email, password, name);
  return account.createEmailPasswordSession(email, password);
}

export async function loginWithEmail(email: string, password: string) {
  if (!appwriteConfigured) return null;
  return account.createEmailPasswordSession(email, password);
}

export async function logoutCurrentUser() {
  if (!appwriteConfigured) return null;
  return account.deleteSession('current');
}

export async function uploadProfileImage(file: File, ownerId: string) {
  if (!bucketId) return null;
  return storage.createFile(bucketId, ID.unique(), file, [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId))
  ]);
}

export async function updateProfilePrefs(prefs: Record<string, unknown>) {
  if (!appwriteConfigured) return null;
  return account.updatePrefs({ prefs });
}

export function profileImagePreview(imageId?: string) {
  if (!imageId || !bucketId) return '';
  return storage.getFileView(bucketId, imageId);
}

function imageFor(imageId?: string) {
  if (!imageId || !bucketId) return '';
  // Appwrite Cloud image transformations require a paid plan. Uploaded meal
  // files are already resized and compressed before upload, so use the free
  // file-view endpoint for reliable rendering on every environment.
  return storage.getFileView(bucketId, imageId);
}

/**
 * Private Appwrite previews cannot reliably be used as a bare <img> URL in
 * Safari because the request needs the Appwrite project/session context.
 * Fetch the preview through the browser session and hand the component a
 * short-lived object URL instead.
 */
export async function loadAppwriteImagePreview(src: string) {
  if (!src || !endpoint || !projectId || !src.startsWith(endpoint)) return null;
  try {
    const bytes = await client.call(
      'GET',
      new URL(src),
      { ...client.getHeaders(), accept: 'image/*' },
      {},
      'arrayBuffer'
    ) as ArrayBuffer;
    return URL.createObjectURL(new Blob([bytes]));
  } catch {
    return null;
  }
}

async function removeStoredImage(fileId?: string) {
  if (!bucketId || !fileId) return;
  try {
    await storage.deleteFile(bucketId, fileId);
  } catch {
    // Storage cleanup must not hide the original meal operation result.
  }
}

function missingDietaryTagsAttribute(error: unknown) {
  return error instanceof Appwrite.AppwriteException
    && error.message.toLowerCase().includes('dietarytags')
    && /attribute|column|unknown|not found|does not exist/i.test(error.message);
}

function missingReviewAttribute(error: unknown) {
  return error instanceof Appwrite.AppwriteException
    && error.message.toLowerCase().includes('review')
    && /attribute|column|unknown|not found|does not exist/i.test(error.message);
}

function mapRating(row: RatingRow): Rating {
  return {
    id: row.$id,
    name: row.name,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    value: typeof row.valueHalf === 'number' ? row.valueHalf / 2 : row.value,
    review: row.review || '',
    color: row.color || '#90a98c',
    ownerId: row.ownerId
  };
}

function mapMeal(row: MealRow): Meal {
  return {
    id: row.$id,
    name: row.name,
    date: row.date,
    image: imageFor(row.imageId),
    recipe: row.recipe || '',
    note: row.note || '',
    circle: row.circle,
    addedBy: row.addedBy,
    ratings: [],
    accent: '#287344',
    ownerId: row.ownerId,
    dietaryTags: (row.dietaryTags ?? []) as Meal['dietaryTags']
  };
}

export async function listAppwriteMeals(ownerId: string, accessibleGroupNames: string[]) {
  if (!dataConfigured || !databaseId || !mealsTableId) return [];
  const response = await tablesDB.listRows<MealRow>({
    databaseId,
    tableId: mealsTableId,
    queries: [Query.orderDesc('date'), Query.limit(100)]
  });
  const allowedGroups = new Set(accessibleGroupNames);
  const meals = response.rows
    .filter((row) => row.ownerId === ownerId || allowedGroups.has(row.circle))
    .map(mapMeal);
  return Promise.all(
    meals.map(async (meal) => ({
      ...meal,
      ratings: await listAppwriteRatings(meal.id)
    }))
  );
}

export async function migrateOwnedMealPermissions(ownerId: string) {
  if (!dataConfigured || !databaseId || !mealsTableId) return;
  const memberships = await teams.list();
  const teamByName = new Map(memberships.teams.map((team) => [team.name, team.$id]));
  let offset = 0;
  while (true) {
    const response = await tablesDB.listRows<MealRow>({
      databaseId,
      tableId: mealsTableId,
      queries: [Query.equal('ownerId', ownerId), Query.limit(100), Query.offset(offset)]
    });
    await Promise.all(response.rows.map(async (row) => {
      const groupTeamId = teamByName.get(row.circle);
      const permissions = mealPermissionsForMembers(ownerId, groupTeamId);
      const updates: Promise<unknown>[] = [tablesDB.updateRow<MealRow>({
        databaseId,
        tableId: mealsTableId,
        rowId: row.$id,
        permissions
      })];
      if (bucketId && row.imageId) {
        updates.push(storage.updateFile({
          bucketId,
          fileId: row.imageId,
          permissions
        }));
      }
      return Promise.all(updates);
    }));
    if (response.rows.length < 100) return;
    offset += response.rows.length;
  }
}

export async function listAppwriteRatings(mealId: string) {
  if (!dataConfigured || !databaseId || !ratingsTableId) return [];
  const response = await tablesDB.listRows<RatingRow>({
    databaseId,
    tableId: ratingsTableId,
    queries: [Query.equal('mealId', mealId), Query.orderDesc('$createdAt')]
  });
  return response.rows.map(mapRating);
}

export async function createAppwriteMeal(meal: Meal, ownerId: string, imageFile?: File, groupTeamId?: string) {
  if (!dataConfigured || !databaseId || !mealsTableId) return null;
  const teamsForUser = meal.circle && !groupTeamId ? await teams.list() : null;
  const groupTeam = teamsForUser?.teams.find((team) => team.name === meal.circle);
  const resolvedTeamId = groupTeamId ?? groupTeam?.$id;
  const permissions = mealPermissionsForMembers(ownerId, resolvedTeamId);
  let imageId = '';
  try {
    if (imageFile && bucketId) {
      const uploaded = await storage.createFile(bucketId, ID.unique(), imageFile, permissions);
      imageId = uploaded.$id;
    }
    const row = {
      databaseId,
      tableId: mealsTableId,
      rowId: meal.id.replace('local-', '') || ID.unique(),
      data: {
        name: meal.name,
        date: meal.date,
        recipe: meal.recipe ?? '',
        note: meal.note,
        circle: meal.circle,
        imageId,
        addedBy: meal.addedBy,
        ownerId,
        dietaryTags: meal.dietaryTags ?? []
      },
      permissions
    };
    try {
      return await tablesDB.createRow<MealRow>(row);
    } catch (error) {
      if (!missingDietaryTagsAttribute(error)) throw error;
      const { dietaryTags: _dietaryTags, ...legacyData } = row.data;
      return tablesDB.createRow<MealRow>({ ...row, data: legacyData });
    }
  } catch (error) {
    await removeStoredImage(imageId);
    throw error;
  }
}

export async function updateAppwriteMeal(
  mealId: string,
  ownerId: string,
  data: Partial<Pick<Meal, 'name' | 'date' | 'recipe' | 'note' | 'circle' | 'dietaryTags'>>,
  imageFile?: File,
  groupTeamId?: string
) {
  if (!dataConfigured || !databaseId || !mealsTableId || mealId.startsWith('local-')) return null;
  const existing = await tablesDB.getRow<MealRow>({ databaseId, tableId: mealsTableId, rowId: mealId });
  if (existing.ownerId !== ownerId) throw new Error('You can only edit your own meals.');
  const circle = data.circle ?? existing.circle;
  const memberships = circle && !groupTeamId ? await teams.list() : null;
  const groupTeam = memberships?.teams.find((team) => team.name === circle);
  const resolvedTeamId = groupTeamId ?? groupTeam?.$id;
  const permissions = mealPermissionsForMembers(ownerId, resolvedTeamId);
  const imageId = imageFile && bucketId
    ? (await storage.createFile(bucketId, ID.unique(), imageFile, permissions)).$id
    : undefined;
  const updateData = { ...data, ...(imageId ? { imageId } : {}) };
  try {
    const updated = await tablesDB.updateRow<MealRow>({
      databaseId,
      tableId: mealsTableId,
      rowId: mealId,
      data: updateData,
      permissions
    });
    if (imageId && existing.imageId && existing.imageId !== imageId) {
      await removeStoredImage(existing.imageId);
    }
    return updated;
  } catch (error) {
    if (missingDietaryTagsAttribute(error) && 'dietaryTags' in updateData) {
      const { dietaryTags: _dietaryTags, ...legacyData } = updateData;
      try {
        const updated = await tablesDB.updateRow<MealRow>({
          databaseId,
          tableId: mealsTableId,
          rowId: mealId,
          data: legacyData,
          permissions
        });
        if (imageId && existing.imageId && existing.imageId !== imageId) {
          await removeStoredImage(existing.imageId);
        }
        return updated;
      } catch (legacyError) {
        await removeStoredImage(imageId);
        throw legacyError;
      }
    }
    await removeStoredImage(imageId);
    throw error;
  }
}

export async function deleteAppwriteMeal(mealId: string, ownerId: string) {
  if (!dataConfigured || !databaseId || !mealsTableId || mealId.startsWith('local-')) return null;
  const meal = await tablesDB.getRow<MealRow>({ databaseId, tableId: mealsTableId, rowId: mealId });
  if (meal.ownerId !== ownerId) throw new Error('You can only delete your own meals.');
  const result = await tablesDB.deleteRow({ databaseId, tableId: mealsTableId, rowId: mealId });
  await removeStoredImage(meal.imageId);
  return result;
}

export async function unassignAppwriteMealsFromGroup(groupName: string, ownerId: string) {
  if (!dataConfigured || !databaseId || !mealsTableId) return;
  while (true) {
    const response = await tablesDB.listRows<MealRow>({
      databaseId,
      tableId: mealsTableId,
      queries: [
        Query.equal('circle', groupName),
        Query.equal('ownerId', ownerId),
        Query.limit(100)
      ]
    });
    if (!response.rows.length) return;
    await Promise.all(response.rows.map((row) =>
      tablesDB.updateRow<MealRow>({
        databaseId,
        tableId: mealsTableId,
        rowId: row.$id,
        data: { circle: '' }
      })
    ));
  }
}

export async function upsertAppwriteRating(mealId: string, rating: Rating, ownerId: string, groupTeamId?: string) {
  if (!dataConfigured || !databaseId || !ratingsTableId) return null;

  const existing = await tablesDB.listRows<RatingRow>({
    databaseId,
    tableId: ratingsTableId,
    queries: [Query.equal('mealId', mealId), Query.equal('ownerId', ownerId), Query.limit(1)]
  });

  const data = {
    mealId,
    value: Math.round(rating.value),
    valueHalf: Math.round(rating.value * 2),
    name: rating.name,
    initials: rating.initials,
    color: rating.color,
    ownerId,
    review: rating.review?.trim() ?? ''
  };
  const permissions = ratingPermissionsForMembers(ownerId, groupTeamId);

  const writeRating = (ratingData: Record<string, unknown>) => existing.rows[0]
    ? tablesDB.updateRow<RatingRow>({
        databaseId,
        tableId: ratingsTableId,
        rowId: existing.rows[0].$id,
        data: ratingData as Partial<RatingRow>,
        permissions
      })
    : tablesDB.createRow<RatingRow>({
        databaseId,
        tableId: ratingsTableId,
        rowId: ID.unique(),
        data: ratingData as Omit<RatingRow, keyof Models.Row>,
        permissions
      });

  try {
    return await writeRating(data);
  } catch (error) {
    if (missingReviewAttribute(error)) {
      const { review: _review, ...withoutReview } = data;
      try {
        return await writeRating(withoutReview);
      } catch (legacyError) {
        if (!(legacyError instanceof Appwrite.AppwriteException) || !legacyError.message.includes('valueHalf')) throw legacyError;
        if (!Number.isInteger(rating.value)) {
          throw new Error('Add the optional valueHalf column to the Appwrite Ratings table to sync half-star ratings.', { cause: legacyError });
        }
        const { valueHalf: _valueHalf, ...legacyData } = withoutReview;
        return writeRating(legacyData);
      }
    }
    if (!(error instanceof Appwrite.AppwriteException) || !error.message.includes('valueHalf')) throw error;
    if (!Number.isInteger(rating.value)) {
      throw new Error('Add the optional valueHalf column to the Appwrite Ratings table to sync half-star ratings.', { cause: error });
    }
    const { valueHalf: _valueHalf, ...legacyData } = data;
    return writeRating(legacyData);
  }
}

export async function listAppwriteCircles(ownerId: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId) return [];
  let teamIds = new Set<string>();
  try {
    const memberships = await teams.list();
    teamIds = new Set(memberships.teams.map((team) => team.$id));
  } catch {
    // The table remains useful for owned groups even if the Teams endpoint is
    // unavailable for the current project configuration.
  }
  const response = await tablesDB.listRows<CircleRow>({
    databaseId,
    tableId: circlesTableId,
    queries: [Query.orderAsc('name'), Query.limit(100)]
  });
  return response.rows
    .filter((row) => row.ownerId === ownerId || teamIds.has(row.$id) || (row.memberIds ?? []).includes(ownerId))
    .map((row): Circle => ({
      id: row.$id,
      name: row.name,
      color: row.color || '#48a868',
      ownerId: row.ownerId,
      privacy: 'invited',
      invitedEmails: [],
      memberIds: row.memberIds ?? [row.ownerId]
    }));
}

export async function createAppwriteCircle(circle: Pick<Circle, 'name' | 'color'>, ownerId: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId) return null;
  const team = await teams.create({ teamId: ID.unique(), name: circle.name, roles: ['owner'] });
  try {
    return await tablesDB.createRow<CircleRow>({
      databaseId,
      tableId: circlesTableId,
      rowId: team.$id,
      data: { name: circle.name, color: circle.color, ownerId },
      permissions: groupPermissions(ownerId, team.$id)
    });
  } catch (error) {
    try {
      await teams.delete({ teamId: team.$id });
    } catch {
      // Do not mask the original table error.
    }
    throw error;
  }
}

export async function updateAppwriteCircle(circleId: string, ownerId: string, data: Pick<Circle, 'name' | 'color'>) {
  if (!circlesConfigured || !databaseId || !circlesTableId) return null;
  const circle = await tablesDB.getRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId });
  if (circle.ownerId !== ownerId) throw new Error('You can only manage groups you own.');
  await teams.updateName({ teamId: circleId, name: data.name });
  return tablesDB.updateRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId, data });
}

export async function listAppwriteCircleMembers(circleId: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId) return [] as CircleMember[];
  const circle = await tablesDB.getRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId });
  const { memberships } = await teams.listMemberships({ teamId: circleId, queries: [Query.limit(100)] });
  const invitations = notificationsConfigured && notificationsTableId
    ? await tablesDB.listRows<NotificationRow>({
        databaseId,
        tableId: notificationsTableId,
        queries: [Query.equal('senderId', circle.ownerId), Query.equal('circleId', circleId), Query.limit(100)]
      }).then((result) => result.rows.filter((row) => row.type === 'group-invite'))
        .catch(() => [] as NotificationRow[])
    : [];
  const resolvedMembers: (CircleMember | null)[] = await Promise.all(memberships.map(async (membership): Promise<CircleMember | null> => {
    const invitation = invitations.find((row) => row.membershipId === membership.$id);
    if (!membership.userId && !invitation) return null;
    const memberUserId = membership.userId || invitation!.recipientId;
    let profile: ProfileRow | null = null;
    if (profilesConfigured && profilesTableId) {
      try {
        profile = await tablesDB.getRow<ProfileRow>({ databaseId, tableId: profilesTableId, rowId: memberUserId });
      } catch { /* Older or pending members may not have a profile row yet. */ }
    }
    return {
      id: membership.$id,
      userId: memberUserId,
      username: profile?.username || normalizeUsername(membership.userName || memberUserId),
      displayName: profile?.displayName || membership.userName || (invitation ? 'Pending invite' : memberUserId),
      isAdmin: memberUserId === circle.ownerId,
      isPending: !membership.userId && Boolean(invitation)
    };
  }));
  const members = resolvedMembers.filter((member): member is CircleMember => member !== null);
  if (!members.some((member) => member.userId === circle.ownerId)) {
    try {
      const profile = profilesConfigured && profilesTableId
        ? await tablesDB.getRow<ProfileRow>({ databaseId, tableId: profilesTableId, rowId: circle.ownerId })
        : null;
      members.unshift({ id: '', userId: circle.ownerId, username: profile?.username || normalizeUsername(circle.ownerId), displayName: profile?.displayName || circle.ownerId, isAdmin: true });
    } catch {
      members.unshift({ id: '', userId: circle.ownerId, username: normalizeUsername(circle.ownerId), displayName: circle.ownerId, isAdmin: true });
    }
  }
  return members.sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.username.localeCompare(b.username));
}

export async function removeAppwriteCircleMember(circleId: string, membershipId: string, adminId: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId || !mealsTableId || !ratingsTableId) throw new Error('Group sharing is not configured yet.');
  const circle = await tablesDB.getRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId });
  if (circle.ownerId !== adminId) throw new Error('Only the group admin can remove members.');
  const { memberships } = await teams.listMemberships({ teamId: circleId, queries: [Query.limit(100)] });
  const target = memberships.find((membership) => membership.$id === membershipId);
  if (!target) throw new Error('That group member could not be found.');
  if (target.userId === circle.ownerId) throw new Error('The group admin cannot be removed.');
  const mealRows = await tablesDB.listRows<MealRow>({ databaseId, tableId: mealsTableId, queries: [Query.equal('circle', circle.name), Query.equal('ownerId', circle.ownerId), Query.limit(100)] });
  const ratingsByMeal = await Promise.all(mealRows.rows.map((meal) => tablesDB.listRows<RatingRow>({ databaseId, tableId: ratingsTableId, queries: [Query.equal('mealId', meal.$id), Query.limit(100)] })));
  await Promise.all([
    tablesDB.updateRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId, permissions: groupPermissions(circle.ownerId, circleId) }),
    ...mealRows.rows.flatMap((meal, index) => [
      tablesDB.updateRow<MealRow>({ databaseId, tableId: mealsTableId, rowId: meal.$id, permissions: mealPermissionsForMembers(meal.ownerId, circleId) }),
      ...(bucketId && meal.imageId ? [storage.updateFile({ bucketId, fileId: meal.imageId, permissions: mealPermissionsForMembers(meal.ownerId, circleId) })] : []),
      ...ratingsByMeal[index].rows.map((rating) => tablesDB.updateRow<RatingRow>({ databaseId, tableId: ratingsTableId, rowId: rating.$id, permissions: ratingPermissionsForMembers(rating.ownerId, circleId) }))
    ])
  ]);
  await teams.deleteMembership({ teamId: circleId, membershipId });
}

export async function deleteAppwriteCircle(circleId: string, ownerId: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId) return null;
  const circle = await tablesDB.getRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId });
  if (circle.ownerId !== ownerId) throw new Error('You can only delete groups you own.');
  await tablesDB.deleteRow({ databaseId, tableId: circlesTableId, rowId: circleId });
  let cleanupError: unknown = null;
  try {
    await teams.delete({ teamId: circleId });
  } catch (error) {
    cleanupError = error;
  }
  return { cleanupError };
}

export async function inviteToAppwriteCircle(circleId: string, username: string, inviterId: string, inviterName: string) {
  if (!circlesConfigured || !databaseId || !circlesTableId) throw new Error('Group sharing is not configured yet.');
  if (!notificationsConfigured || !notificationsTableId) throw new Error('Group invite notifications are not configured yet.');
  const profile = await findAppwriteProfile(username);
  if (!profile) throw new Error(`No RateMyPlate user was found for @${normalizeUsername(username)}.`);
  if (profile.userId === inviterId) throw new Error('You are already a member of this group.');
  const circle = await tablesDB.getRow<CircleRow>({ databaseId, tableId: circlesTableId, rowId: circleId });
  if (circle.ownerId !== inviterId) throw new Error('Only the group owner can invite people.');
  let membership: Models.Membership | null = null;
  try {
    membership = await teams.createMembership({
      teamId: circleId,
      roles: ['member'],
      userId: profile.userId,
      name: profile.displayName,
      url: `${window.location.origin}/`
    });
  } catch (error) {
    // Direct row permissions below make an existing-user invite usable even
    // when Appwrite keeps the Teams membership in its pending state.
    if (!(error instanceof Appwrite.AppwriteException) || !/already|exist|member/i.test(error.message)) throw error;
  }
  await tablesDB.updateRow<CircleRow>({
    databaseId,
    tableId: circlesTableId,
    rowId: circleId,
    permissions: groupPermissions(inviterId, circleId)
  });
  const meals = await tablesDB.listRows<MealRow>({
    databaseId,
    tableId: mealsTableId!,
    queries: [Query.equal('circle', circle.name), Query.equal('ownerId', inviterId), Query.limit(100)]
  });
  await Promise.all(meals.rows.map(async (meal) => {
    await tablesDB.updateRow<MealRow>({
      databaseId,
      tableId: mealsTableId!,
      rowId: meal.$id,
      permissions: mealPermissionsForMembers(inviterId, circleId)
    });
    if (bucketId && meal.imageId) {
      await storage.updateFile({
        bucketId,
        fileId: meal.imageId,
        permissions: mealPermissionsForMembers(inviterId, circleId)
      });
    }
  }));
  const notification = await createAppwriteNotification({
    recipientId: profile.userId,
    type: 'group-invite',
    senderId: inviterId,
    senderName: inviterName,
    circleId,
    circleName: circle.name,
    membershipId: membership?.$id
  });
  return { profile, membership, notification };
}
