import { json, type RequestHandler } from '@sveltejs/kit';
import { ID, Permission, Query, Role } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string | undefined;
const mealsTableId = import.meta.env.VITE_APPWRITE_MEALS_TABLE_ID as string | undefined;
const ratingsTableId = import.meta.env.VITE_APPWRITE_RATINGS_TABLE_ID as string | undefined;
const circlesTableId = import.meta.env.VITE_APPWRITE_CIRCLES_TABLE_ID as string | undefined;
const profilesTableId = import.meta.env.VITE_APPWRITE_PROFILES_TABLE_ID as string | undefined;
const notificationsTableId = import.meta.env.VITE_APPWRITE_NOTIFICATIONS_TABLE_ID as string | undefined;
const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID as string | undefined;

type Row = {
  $id: string;
  $createdAt?: string;
  $permissions?: string[];
  [key: string]: unknown;
};

type AppwriteError = Error & { status?: number; code?: number };
type User = { $id: string; name: string; email?: string };
type CircleRow = Row & { name: string; ownerId: string; memberIds?: string[]; color?: string };
type MealRow = Row & { ownerId: string; circle: string; imageId?: string; name: string };
type ProfileRow = Row & { username: string; displayName: string; userId: string };
type Membership = {
  $id: string;
  userId?: string;
  userName?: string;
  roles?: string[];
  status?: string;
};

function runtimeKey(event: Parameters<RequestHandler>[0]) {
  return (event.platform as { env?: { APPWRITE_API_KEY?: string } } | undefined)?.env?.APPWRITE_API_KEY;
}

function requireConfig(apiKey: string | undefined) {
  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw Object.assign(new Error('Private Appwrite data access is not configured.'), { status: 503 });
  }
}

function pathPart(value: string) {
  return encodeURIComponent(value);
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

async function appwriteRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; jwt?: string; apiKey?: string; formData?: FormData }
): Promise<T> {
  const headers = new Headers({ 'X-Appwrite-Project': projectId! });
  if (options.jwt) headers.set('X-Appwrite-JWT', options.jwt);
  if (options.apiKey) headers.set('X-Appwrite-Key', options.apiKey);
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${endpoint}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string; code?: number };
    throw Object.assign(new Error(detail.message || `Appwrite request failed (${response.status}).`), {
      status: response.status,
      code: detail.code
    }) satisfies AppwriteError;
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

function tablePath(tableId: string) {
  return `/tablesdb/${pathPart(databaseId!)}/tables/${pathPart(tableId)}/rows`;
}

function withQueries(path: string, queries: string[]) {
  const params = new URLSearchParams();
  queries.forEach((query, index) => params.set(`queries[${index}]`, query));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function listRows<T extends Row>(apiKey: string, tableId: string, queries: string[] = []) {
  return appwriteRequest<{ rows: T[]; total: number }>(withQueries(tablePath(tableId), queries), { apiKey });
}

async function listAllRows<T extends Row>(apiKey: string, tableId: string, queries: string[] = []) {
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const response = await listRows<T>(apiKey, tableId, [...queries, Query.limit(100), Query.offset(offset)]);
    rows.push(...response.rows);
    if (response.rows.length < 100) return rows;
    offset += response.rows.length;
  }
}

function hasTeamReadPermission(row: Row, teamId: string) {
  const expected = Permission.read(Role.team(teamId));
  return row.$permissions?.includes(expected) ?? false;
}

function mealBelongsToCircle(meal: MealRow, circle: CircleRow) {
  return hasTeamReadPermission(meal, circle.$id);
}

async function getRow<T extends Row>(apiKey: string, tableId: string, rowId: string) {
  return appwriteRequest<T>(`${tablePath(tableId)}/${pathPart(rowId)}`, { apiKey });
}

async function getRowOrNull<T extends Row>(apiKey: string, tableId: string, rowId: string) {
  try {
    return await getRow<T>(apiKey, tableId, rowId);
  } catch (error) {
    if ((error as AppwriteError).status === 404) return null;
    throw error;
  }
}

async function createRow<T extends Row>(apiKey: string, tableId: string, rowId: string, data: Record<string, unknown>, permissions: string[]) {
  return appwriteRequest<T>(tablePath(tableId), {
    method: 'POST',
    apiKey,
    body: { rowId, data, permissions }
  });
}

async function updateRow<T extends Row>(
  apiKey: string,
  tableId: string,
  rowId: string,
  data?: Record<string, unknown>,
  permissions?: string[]
) {
  return appwriteRequest<T>(`${tablePath(tableId)}/${pathPart(rowId)}`, {
    method: 'PATCH',
    apiKey,
    body: { ...(data ? { data } : {}), ...(permissions ? { permissions } : {}) }
  });
}

async function deleteRow(apiKey: string, tableId: string, rowId: string) {
  return appwriteRequest(`${tablePath(tableId)}/${pathPart(rowId)}`, { method: 'DELETE', apiKey });
}

async function currentUser(jwt: string) {
  return appwriteRequest<User>('/account', { jwt });
}

async function userTeams(jwt: string) {
  return appwriteRequest<{ teams: Array<{ $id: string; name: string }> }>(withQueries('/teams', [Query.limit(100)]), { jwt });
}

function profilePermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ];
}

function circlePermissions(ownerId: string, teamId: string) {
  return [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
    Permission.read(Role.team(teamId))
  ];
}

function mealPermissions(ownerId: string, teamId?: string) {
  return [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
    ...(teamId ? [Permission.read(Role.team(teamId))] : [])
  ];
}

function ratingPermissions(ownerId: string, teamId?: string) {
  return mealPermissions(ownerId, teamId);
}

function notificationPermissions(recipientId: string, senderId: string) {
  return [
    Permission.read(Role.user(recipientId)),
    Permission.read(Role.user(senderId)),
    Permission.update(Role.user(recipientId)),
    Permission.delete(Role.user(recipientId))
  ];
}

function filePermissions(ownerId: string, teamId?: string) {
  return [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
    ...(teamId ? [Permission.read(Role.team(teamId))] : [])
  ];
}

async function getCirclesForUser(apiKey: string, jwt: string, userId: string) {
  if (!circlesTableId) return [] as CircleRow[];
  const teams = await userTeams(jwt).catch(() => ({ teams: [] }));
  const owned = await listAllRows<CircleRow>(apiKey, circlesTableId, [Query.equal('ownerId', userId)]);
  const teamCircles = await Promise.all(teams.teams.map((team) => getRowOrNull<CircleRow>(apiKey, circlesTableId, team.$id)));
  const byId = new Map<string, CircleRow>();
  for (const circle of [...owned, ...teamCircles.filter((item): item is CircleRow => Boolean(item))]) {
    if (circle.ownerId === userId || teams.teams.some((team) => team.$id === circle.$id)) {
      byId.set(circle.$id, circle);
    }
  }
  return [...byId.values()];
}

async function getAccessibleCircle(apiKey: string, jwt: string, userId: string, circleId: string) {
  if (!circlesTableId) throw Object.assign(new Error('Groups are not configured.'), { status: 503 });
  const circle = await getRow<CircleRow>(apiKey, circlesTableId, circleId);
  if (circle.ownerId === userId) return circle;
  const memberships = await userTeams(jwt);
  if (memberships.teams.some((team) => team.$id === circleId)) return circle;
  throw Object.assign(new Error('You do not have access to this group.'), { status: 403 });
}

async function ownedCircle(apiKey: string, userId: string, circleId: string) {
  if (!circlesTableId) throw Object.assign(new Error('Groups are not configured.'), { status: 503 });
  const circle = await getRow<CircleRow>(apiKey, circlesTableId, circleId);
  if (circle.ownerId !== userId) throw Object.assign(new Error('Only the group admin can do that.'), { status: 403 });
  return circle;
}

async function canAccessMeal(apiKey: string, jwt: string, userId: string, meal: MealRow) {
  if (meal.ownerId === userId) return true;
  const circles = await getCirclesForUser(apiKey, jwt, userId);
  return circles.some((circle) => mealBelongsToCircle(meal, circle));
}

async function uploadFile(apiKey: string, file: File, permissions: string[]) {
  if (!bucketId) throw Object.assign(new Error('Appwrite storage is not configured.'), { status: 503 });
  const form = new FormData();
  form.append('fileId', ID.unique());
  form.append('file', file, file.name || 'upload');
  permissions.forEach((permission) => form.append('permissions[]', permission));
  return appwriteRequest<{ $id: string }>(`/storage/buckets/${pathPart(bucketId)}/files`, {
    method: 'POST',
    apiKey,
    formData: form
  });
}

async function deleteFile(apiKey: string, fileId: string) {
  if (!bucketId || !fileId) return;
  await appwriteRequest(`/storage/buckets/${pathPart(bucketId)}/files/${pathPart(fileId)}`, { method: 'DELETE', apiKey });
}

async function profilesForMemberships(apiKey: string, memberships: Membership[], invitations: Row[]) {
  const members = await Promise.all(memberships.map(async (membership) => {
    const invite = invitations.find((row) => row.membershipId === membership.$id);
    const userId = membership.userId || (invite?.recipientId as string | undefined);
    if (!userId) return null;
    const profile = profilesTableId ? await getRowOrNull<ProfileRow>(apiKey, profilesTableId, userId) : null;
    const username = profile?.username || normalizeUsername(membership.userName || userId);
    return {
      id: membership.$id,
      userId,
      username,
      displayName: profile?.displayName || membership.userName || (invite ? 'Pending invite' : userId),
      isAdmin: Boolean(membership.roles?.includes('owner')),
      isPending: !membership.userId && Boolean(invite)
    };
  }));
  return members.filter((member): member is NonNullable<typeof member> => Boolean(member));
}

async function handleOperation(
  operation: string,
  args: Record<string, unknown>,
  file: File | null,
  user: User,
  jwt: string,
  apiKey: string
) {
  const userId = user.$id;

  if (operation === 'ensure-profile') {
    if (!profilesTableId) throw Object.assign(new Error('Profiles are not configured.'), { status: 503 });
    const displayName = String(args.displayName || user.name || 'User');
    const requested = normalizeUsername(String(args.requestedUsername || ''));
    const fallback = normalizeUsername(String(user.email || '').split('@')[0] || displayName.split(/\s+/)[0] || `user-${userId.slice(-6)}`)
      || `user-${userId.slice(-6)}`;
    const existing = await getRowOrNull<ProfileRow>(apiKey, profilesTableId, userId);
    if (existing) {
      let username = existing.username;
      if (requested && requested !== existing.username) {
        const conflict = await listRows<ProfileRow>(apiKey, profilesTableId, [Query.equal('username', requested), Query.limit(1)]);
        if (!conflict.rows.some((row) => row.$id !== userId)) username = requested;
      }
      return updateRow<ProfileRow>(apiKey, profilesTableId, userId, { username, displayName }, profilePermissions(userId));
    }
    let username = requested || fallback;
    const conflict = await listRows<ProfileRow>(apiKey, profilesTableId, [Query.equal('username', username), Query.limit(1)]);
    if (conflict.rows.length) username = `${username}-${userId.slice(-4)}`;
    return createRow<ProfileRow>(apiKey, profilesTableId, userId, { userId, username, displayName }, profilePermissions(userId));
  }

  if (operation === 'find-profile' || operation === 'search-profiles') {
    if (!profilesTableId) return operation === 'find-profile' ? null : [];
    const normalized = normalizeUsername(String(args.username || ''));
    if (!normalized) return operation === 'find-profile' ? null : [];
    if (operation === 'find-profile') {
      const result = await listRows<ProfileRow>(apiKey, profilesTableId, [Query.equal('username', normalized), Query.limit(1)]);
      return result.rows[0] ?? null;
    }
    const limit = Math.max(1, Math.min(20, Number(args.limit) || 8));
    try {
      const result = await listAllRows<ProfileRow>(apiKey, profilesTableId, [Query.startsWith('username', normalized)]);
      return result.sort((a, b) => a.username.localeCompare(b.username)).slice(0, limit);
    } catch {
      const result = await listAllRows<ProfileRow>(apiKey, profilesTableId);
      return result.filter((row) => row.username.toLowerCase().startsWith(normalized))
        .sort((a, b) => a.username.localeCompare(b.username)).slice(0, limit);
    }
  }

  if (operation === 'list-notifications') {
    if (!notificationsTableId) return [];
    const result = await listAllRows<Row>(apiKey, notificationsTableId, [Query.equal('recipientId', userId), Query.orderDesc('$createdAt')]);
    await Promise.all(result.map((row) => updateRow(apiKey, notificationsTableId!, row.$id, undefined,
      notificationPermissions(userId, String(row.senderId || userId)))));
    return result.slice(0, 50);
  }

  if (operation === 'mark-notification-read') {
    if (!notificationsTableId) return null;
    const notificationId = String(args.notificationId || '');
    const notification = await getRow<Row>(apiKey, notificationsTableId, notificationId);
    if (notification.recipientId !== userId) throw Object.assign(new Error('You cannot change this notification.'), { status: 403 });
    return updateRow(apiKey, notificationsTableId, notificationId, { read: true }, notificationPermissions(userId, String(notification.senderId)));
  }

  if (operation === 'list-circles') {
    if (!circlesTableId) return [];
    const circles = await getCirclesForUser(apiKey, jwt, userId);
    await Promise.all(circles.map((circle) => updateRow(apiKey, circlesTableId!, circle.$id, undefined,
      circlePermissions(circle.ownerId, circle.$id))));
    return circles;
  }

  if (operation === 'create-circle') {
    if (!circlesTableId) return null;
    const circleId = String(args.circleId || '');
    const team = await appwriteRequest<{ $id: string }>('/teams/' + pathPart(circleId), { jwt });
    if (team.$id !== circleId) throw Object.assign(new Error('The group team could not be verified.'), { status: 403 });
    const membershipsPath = withQueries(`/teams/${pathPart(circleId)}/memberships`, [Query.equal('userId', userId), Query.limit(1)]);
    const { memberships } = await appwriteRequest<{ memberships: Membership[] }>(membershipsPath, { jwt });
    if (!memberships.some((membership) => membership.roles?.includes('owner'))) {
      throw Object.assign(new Error('Only the group admin can create its group record.'), { status: 403 });
    }
    const data = args.circle as { name?: string; color?: string };
    return createRow<CircleRow>(apiKey, circlesTableId, circleId, {
      name: String(data?.name || ''), color: String(data?.color || '#48a868'), ownerId: userId
    }, circlePermissions(userId, circleId));
  }

  if (operation === 'update-circle') {
    if (!circlesTableId) return null;
    const circleId = String(args.circleId || '');
    const circle = await ownedCircle(apiKey, userId, circleId);
    const data = args.data as { name?: string; color?: string };
    if (typeof data?.name === 'string' && data.name !== circle.name) {
      await appwriteRequest(`/teams/${pathPart(circleId)}`, { method: 'PUT', apiKey, body: { name: data.name } });
    }
    const updated = await updateRow<CircleRow>(apiKey, circlesTableId, circleId, {
      ...(typeof data?.name === 'string' ? { name: data.name } : {}),
      ...(typeof data?.color === 'string' ? { color: data.color } : {})
    });
    if (typeof data?.name === 'string' && data.name !== circle.name && mealsTableId) {
      const meals = await listAllRows<MealRow>(apiKey, mealsTableId, [Query.equal('circle', circle.name)]);
      await Promise.all(meals.filter((meal) => mealBelongsToCircle(meal, circle)).map((meal) =>
        updateRow(apiKey, mealsTableId!, meal.$id, { circle: data.name })
      ));
    }
    return updated;
  }

  if (operation === 'list-circle-members') {
    if (!circlesTableId || !notificationsTableId) return [];
    const circleId = String(args.circleId || '');
    const circle = await getAccessibleCircle(apiKey, jwt, userId, circleId);
    const membershipsPath = withQueries(`/teams/${pathPart(circleId)}/memberships`, [Query.limit(100)]);
    const { memberships } = await appwriteRequest<{ memberships: Membership[] }>(membershipsPath, { apiKey });
    const invitations = await listAllRows<Row>(apiKey, notificationsTableId, [
      Query.equal('senderId', circle.ownerId), Query.equal('circleId', circleId)
    ]).catch(() => [] as Row[]);
    const members = await profilesForMemberships(apiKey, memberships, invitations.filter((row) => row.type === 'group-invite'));
    if (!members.some((member) => member.userId === circle.ownerId)) {
      const owner = profilesTableId ? await getRowOrNull<ProfileRow>(apiKey, profilesTableId, circle.ownerId) : null;
      members.unshift({ id: '', userId: circle.ownerId, username: owner?.username || normalizeUsername(circle.ownerId), displayName: owner?.displayName || circle.ownerId, isAdmin: true, isPending: false });
    }
    return members.sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.username.localeCompare(b.username));
  }

  if (operation === 'remove-circle-member') {
    if (!circlesTableId || !mealsTableId || !ratingsTableId) throw Object.assign(new Error('Group sharing is not configured.'), { status: 503 });
    const circleId = String(args.circleId || '');
    const circle = await ownedCircle(apiKey, userId, circleId);
    const membershipId = String(args.membershipId || '');
    const membershipsPath = withQueries(`/teams/${pathPart(circleId)}/memberships`, [Query.limit(100)]);
    const { memberships } = await appwriteRequest<{ memberships: Membership[] }>(membershipsPath, { apiKey });
    const target = memberships.find((membership) => membership.$id === membershipId);
    if (!target) throw Object.assign(new Error('That group member could not be found.'), { status: 404 });
    if (target.userId === circle.ownerId) throw Object.assign(new Error('The group admin cannot be removed.'), { status: 400 });
    await appwriteRequest(`/teams/${pathPart(circleId)}/memberships/${pathPart(membershipId)}`, { method: 'DELETE', apiKey });
    return { success: true };
  }

  if (operation === 'delete-circle') {
    if (!circlesTableId) return null;
    const circleId = String(args.circleId || '');
    await ownedCircle(apiKey, userId, circleId);
    const team = await appwriteRequest(`/teams/${pathPart(circleId)}`, { method: 'DELETE', apiKey }).catch(() => null);
    await deleteRow(apiKey, circlesTableId, circleId);
    return { cleanupError: null, team };
  }

  if (operation === 'invite-circle-member') {
    if (!circlesTableId || !profilesTableId || !notificationsTableId || !mealsTableId) {
      throw Object.assign(new Error('Group invites are not configured.'), { status: 503 });
    }
    const circleId = String(args.circleId || '');
    const circle = await ownedCircle(apiKey, userId, circleId);
    const username = normalizeUsername(String(args.username || ''));
    const profileResponse = await listRows<ProfileRow>(apiKey, profilesTableId, [Query.equal('username', username), Query.limit(1)]);
    const profile = profileResponse.rows[0];
    if (!profile) throw Object.assign(new Error(`No RateMyPlate user was found for @${username}.`), { status: 404 });
    if (profile.$id === userId) throw Object.assign(new Error('You are already a member of this group.'), { status: 400 });
    const membershipsPath = withQueries(`/teams/${pathPart(circleId)}/memberships`, [Query.limit(100)]);
    const listed = await appwriteRequest<{ memberships: Membership[] }>(membershipsPath, { apiKey });
    let membership = listed.memberships.find((item) => item.userId === profile.$id) ?? null;
    if (!membership) {
      const created = await appwriteRequest<Membership>(`/teams/${pathPart(circleId)}/memberships`, {
        method: 'POST', apiKey,
        body: { roles: ['member'], userId: profile.$id, name: profile.displayName, url: String(args.origin || '') }
      });
      membership = created;
    }
    await updateRow(apiKey, circlesTableId, circleId, undefined, circlePermissions(userId, circleId));
    const meals = (await listAllRows<MealRow>(apiKey, mealsTableId, [Query.equal('circle', circle.name), Query.equal('ownerId', userId)]))
      .filter((meal) => mealBelongsToCircle(meal, circle));
    await Promise.all(meals.map(async (meal) => {
      await updateRow(apiKey, mealsTableId, meal.$id, undefined, mealPermissions(userId, circleId));
      if (bucketId && meal.imageId) {
        await appwriteRequest(`/storage/buckets/${pathPart(bucketId)}/files/${pathPart(meal.imageId)}`, {
          method: 'PUT', apiKey, body: { permissions: filePermissions(userId, circleId) }
        });
      }
    }));
    const notification = await createRow<Row>(apiKey, notificationsTableId, ID.unique(), {
      recipientId: profile.$id,
      type: 'group-invite',
      senderId: userId,
      senderName: String(args.inviterName || user.name),
      circleId,
      circleName: circle.name,
      membershipId: membership.$id,
      read: false
    }, notificationPermissions(profile.$id, userId));
    return { profile, membership, notification };
  }

  if (operation === 'list-meals') {
    if (!mealsTableId) return [];
    const circles = await getCirclesForUser(apiKey, jwt, userId);
    const queries = [Query.equal('ownerId', userId)];
    const ownedRows = await listAllRows<MealRow>(apiKey, mealsTableId, queries);
    const groupNames = [...new Set(circles.map((circle) => circle.name).filter(Boolean))];
    const sharedRows = groupNames.length
      ? await listAllRows<MealRow>(apiKey, mealsTableId, [Query.equal('circle', groupNames)])
      : [];
    const byId = new Map<string, MealRow>();
    [...ownedRows, ...sharedRows.filter((row) => circles.some((circle) => mealBelongsToCircle(row, circle)))].forEach((row) => byId.set(row.$id, row));
    return [...byId.values()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  if (operation === 'list-ratings') {
    if (!mealsTableId || !ratingsTableId) return [];
    const mealId = String(args.mealId || '');
    const meal = await getRow<MealRow>(apiKey, mealsTableId, mealId);
    if (!await canAccessMeal(apiKey, jwt, userId, meal)) throw Object.assign(new Error('You do not have access to those ratings.'), { status: 403 });
    const result = await listAllRows<Row>(apiKey, ratingsTableId, [Query.equal('mealId', mealId), Query.orderDesc('$createdAt')]);
    return result;
  }

  if (operation === 'migrate-meal-permissions') {
    if (!mealsTableId) return null;
    const circles = await getCirclesForUser(apiKey, jwt, userId);
    const rows = await listAllRows<MealRow>(apiKey, mealsTableId, [Query.equal('ownerId', userId)]);
    await Promise.all(rows.map(async (row) => {
      const matchingCircles = circles.filter((circle) => circle.name === row.circle);
      const existingGroup = matchingCircles.find((circle) => mealBelongsToCircle(row, circle));
      const group = existingGroup ?? (matchingCircles.length === 1 ? matchingCircles[0] : undefined);
      const permissions = mealPermissions(userId, group?.$id);
      await updateRow(apiKey, mealsTableId, row.$id, undefined, permissions);
      if (bucketId && row.imageId) {
        await appwriteRequest(`/storage/buckets/${pathPart(bucketId)}/files/${pathPart(row.imageId)}`, {
          method: 'PUT', apiKey, body: { permissions: filePermissions(userId, group?.$id) }
        });
      }
      if (ratingsTableId) {
        const ratings = await listAllRows<Row>(apiKey, ratingsTableId, [Query.equal('mealId', row.$id)]);
        await Promise.all(ratings.map((rating) => updateRow(apiKey, ratingsTableId!, rating.$id, undefined,
          ratingPermissions(String(rating.ownerId || userId), group?.$id))));
      }
    }));
    return null;
  }

  if (operation === 'create-meal') {
    if (!mealsTableId) return null;
    const meal = args.meal as Record<string, unknown>;
    const circleName = String(meal.circle || '');
    const circles = circleName ? await getCirclesForUser(apiKey, jwt, userId) : [];
    const requestedTeamId = String(args.groupTeamId || '');
    const circle = circleName ? (circles.find((item) => item.$id === requestedTeamId) ?? circles.find((item) => item.name === circleName)) : undefined;
    if (circleName && circle?.name !== circleName) throw Object.assign(new Error('You do not have access to that group.'), { status: 403 });
    if (circleName && !circle) throw Object.assign(new Error('You do not have access to that group.'), { status: 403 });
    const profile = profilesTableId ? await getRowOrNull<ProfileRow>(apiKey, profilesTableId, userId) : null;
    let imageId = '';
    if (file) imageId = (await uploadFile(apiKey, file, filePermissions(userId, circle?.$id))).$id;
    const data = {
      name: String(meal.name || ''),
      date: String(meal.date || ''),
      recipe: String(meal.recipe || ''),
      note: String(meal.note || ''),
      circle: circleName,
      imageId,
      addedBy: profile?.displayName || user.name,
      ownerId: userId,
      dietaryTags: Array.isArray(meal.dietaryTags) ? meal.dietaryTags : []
    };
    const rowId = ID.unique();
    try {
      return await createRow(apiKey, mealsTableId, rowId, data, mealPermissions(userId, circle?.$id));
    } catch (error) {
      if (String((error as Error).message).toLowerCase().includes('dietarytags')) {
        const { dietaryTags: _tags, ...legacyData } = data;
        return createRow(apiKey, mealsTableId, rowId, legacyData, mealPermissions(userId, circle?.$id));
      }
      if (imageId) await deleteFile(apiKey, imageId).catch(() => undefined);
      throw error;
    }
  }

  if (operation === 'update-meal') {
    if (!mealsTableId) return null;
    const mealId = String(args.mealId || '');
    const existing = await getRow<MealRow>(apiKey, mealsTableId, mealId);
    if (existing.ownerId !== userId) throw Object.assign(new Error('You can only edit your own meals.'), { status: 403 });
    const data = args.data as Record<string, unknown>;
    const circleName = String(data.circle ?? existing.circle ?? '');
    const circles = circleName ? await getCirclesForUser(apiKey, jwt, userId) : [];
    const requestedTeamId = String(args.groupTeamId || '');
    const circle = circleName ? (circles.find((item) => item.$id === requestedTeamId) ?? circles.find((item) => item.name === circleName)) : undefined;
    if (circleName && circle?.name !== circleName) throw Object.assign(new Error('You do not have access to that group.'), { status: 403 });
    if (circleName && !circle) throw Object.assign(new Error('You do not have access to that group.'), { status: 403 });
    const imageId = file ? (await uploadFile(apiKey, file, filePermissions(userId, circle?.$id))).$id : undefined;
    const allowedFields = ['name', 'date', 'recipe', 'note', 'circle', 'dietaryTags'];
    const updateData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));
    if (imageId) updateData.imageId = imageId;
    try {
      const updated = await updateRow(apiKey, mealsTableId, mealId, updateData, mealPermissions(userId, circle?.$id));
      if (imageId && existing.imageId) await deleteFile(apiKey, existing.imageId).catch(() => undefined);
      return updated;
    } catch (error) {
      if (String((error as Error).message).toLowerCase().includes('dietarytags') && 'dietaryTags' in updateData) {
        delete updateData.dietaryTags;
        const updated = await updateRow(apiKey, mealsTableId, mealId, updateData, mealPermissions(userId, circle?.$id));
        if (imageId && existing.imageId) await deleteFile(apiKey, existing.imageId).catch(() => undefined);
        return updated;
      }
      if (imageId) await deleteFile(apiKey, imageId).catch(() => undefined);
      throw error;
    }
  }

  if (operation === 'delete-meal') {
    if (!mealsTableId) return null;
    const mealId = String(args.mealId || '');
    const meal = await getRow<MealRow>(apiKey, mealsTableId, mealId);
    if (meal.ownerId !== userId) throw Object.assign(new Error('You can only delete your own meals.'), { status: 403 });
    await deleteRow(apiKey, mealsTableId, mealId);
    if (meal.imageId) await deleteFile(apiKey, meal.imageId).catch(() => undefined);
    return { success: true };
  }

  if (operation === 'unassign-meals') {
    if (!mealsTableId) return null;
    const groupName = String(args.groupName || '');
    const circle = (await getCirclesForUser(apiKey, jwt, userId)).find((item) => item.name === groupName);
    if (!circle || circle.ownerId !== userId) throw Object.assign(new Error('Only the group admin can unassign its meals.'), { status: 403 });
    const rows = (await listAllRows<MealRow>(apiKey, mealsTableId, [Query.equal('circle', groupName), Query.equal('ownerId', userId)]))
      .filter((row) => mealBelongsToCircle(row, circle));
    await Promise.all(rows.map((row) => updateRow(apiKey, mealsTableId, row.$id, { circle: '' }, mealPermissions(userId))));
    return null;
  }

  if (operation === 'upsert-rating') {
    if (!mealsTableId || !ratingsTableId) return null;
    const mealId = String(args.mealId || '');
    const meal = await getRow<MealRow>(apiKey, mealsTableId, mealId);
    if (!await canAccessMeal(apiKey, jwt, userId, meal)) throw Object.assign(new Error('You do not have access to this meal.'), { status: 403 });
    const rating = args.rating as Record<string, unknown>;
    const existing = await listRows<Row>(apiKey, ratingsTableId, [Query.equal('mealId', mealId), Query.equal('ownerId', userId), Query.limit(1)]);
    const group = meal.circle ? (await getCirclesForUser(apiKey, jwt, userId)).find((circle) => mealBelongsToCircle(meal, circle)) : undefined;
    const profile = profilesTableId ? await getRowOrNull<ProfileRow>(apiKey, profilesTableId, userId) : null;
    const data: Record<string, unknown> = {
      mealId,
      value: Math.round(Number(rating.value)),
      valueHalf: Math.round(Number(rating.value) * 2),
      name: profile?.displayName || user.name,
      initials: String(rating.initials || user.name.slice(0, 2).toUpperCase()),
      color: String(rating.color || '#90a98c'),
      ownerId: userId,
      review: String(rating.review || '').trim()
    };
    const write = (value: Record<string, unknown>) => existing.rows[0]
      ? updateRow(apiKey, ratingsTableId, existing.rows[0].$id, value, ratingPermissions(userId, group?.$id))
      : createRow(apiKey, ratingsTableId, ID.unique(), value, ratingPermissions(userId, group?.$id));
    const variant = { ...data };
    while (true) {
      try {
        const saved = await write(variant);
        return saved;
      } catch (error) {
        const message = String((error as Error).message).toLowerCase();
        if (message.includes('review') && 'review' in variant) {
          delete variant.review;
          continue;
        }
        if (message.includes('valuehalf') && 'valueHalf' in variant) {
          if (!Number.isInteger(Number(rating.value))) {
            throw new Error('This Ratings table is missing the valueHalf column, so it cannot save half-star ratings.');
          }
          delete variant.valueHalf;
          continue;
        }
        throw error;
      }
    }
  }

  if (operation === 'upload-profile-image') {
    if (!file) throw Object.assign(new Error('Choose an image first.'), { status: 400 });
    const permissions = [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))];
    return uploadFile(apiKey, file, permissions);
  }

  throw Object.assign(new Error('Unsupported data operation.'), { status: 400 });
}

export const POST: RequestHandler = async (event) => {
  try {
    const origin = event.request.headers.get('origin');
    if (origin && origin !== new URL(event.request.url).origin) {
      throw Object.assign(new Error('Cross-origin request rejected.'), { status: 403 });
    }
    const apiKey = runtimeKey(event);
    requireConfig(apiKey);
    const jwt = event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
    const user = await currentUser(jwt);
    const contentType = event.request.headers.get('content-type') || '';
    let operation = '';
    let args: Record<string, unknown> = {};
    let file: File | null = null;
    if (contentType.includes('multipart/form-data')) {
      const form = await event.request.formData();
      const payload = JSON.parse(String(form.get('payload') || '{}')) as { operation?: string; args?: Record<string, unknown> };
      operation = String(payload.operation || '');
      args = payload.args || {};
      const candidate = form.get('file');
      if (candidate instanceof File) file = candidate;
    } else {
      const payload = await event.request.json() as { operation?: string; args?: Record<string, unknown> };
      operation = String(payload.operation || '');
      args = payload.args || {};
    }
    const result = await handleOperation(operation, args, file, user, jwt, apiKey!);
    return json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const appwriteError = error as AppwriteError;
    return json({ error: appwriteError.message || 'Private Appwrite operation failed.' }, {
      status: appwriteError.status || 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
};
