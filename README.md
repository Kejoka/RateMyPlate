# RateMyPlate

RateMyPlate is a Svelte 5 progressive web app for logging meals and sharing group ratings. It uses Appwrite Auth for real accounts, TablesDB for meals and ratings, and Storage for meal photos.

## Run locally

The repository has two Appwrite data spaces. Local development uses the `Food Tracker` project; the deployed app uses the isolated `Food Tracker Production` project.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite automatically loads `.env.development.local`, which is ignored by git and already points at the local project. To recreate it in a fresh checkout:

```bash
cp .env.development.example .env.development.local
```

Run `npm run check` for Svelte’s type and accessibility checks. Run `npm run build` to create a Cloudflare-compatible production build.

## Appwrite spaces

### Local development — `Food Tracker`

- Project: `6b07005b0011c2e9da5c`
- Database: `6b0700df0034fafdc2a1`
- Meals table: `6b0701120030ec9b4de0`
- Ratings table: `6b07032300033fdbec08`
- Circles table: `6b071910001827327fb4`
- Photo bucket: `6b0703d00029ea7877a3`
- Web platform: `127.0.0.1`

### Production — `Food Tracker Production`

- Project: `6b07061f0034777d305d`
- Database: `6b07063d0036acb4f8fc`
- Meals table: `6b070649001b6534fcfc`
- Ratings table: `6b07077f001cdb2bff90`
- Circles table: `6b070eb8001c0f69789e`
- Photo bucket: `6b0708700022d260cfa5`
- Email/password authentication: enabled

Both spaces have the same schema and authenticated-user create/read/update/delete permissions. Their users, meals, ratings, and photos are isolated because they belong to separate Appwrite projects.

**Important ownership setup:** the app checks `ownerId` before editing or deleting a meal, and writes owner-only row permissions (plus group read permission) to new meals and their photos. On login, it migrates the current user's existing meal rows and photo permissions. The development `Meals` and `Circles` tables now have Row Security enabled and table-level create-only access; the two existing development meals belong to the test account and remain accessible after migration. Production security has not been changed in this setup. Before relying on ownership or group privacy in production, migrate every existing meal owner's rows and photos, enable Row Security on `Meals` and `Circles`, and remove table-wide `read`, `update`, and `delete` grants (keep authenticated `create`). Until then, a user can bypass the UI and call Appwrite directly. The app does not claim groups are private based only on client-side filtering.

## Cloudflare Pages

Create a Pages project from this repository with:

- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`
- Root directory: the repository root

In Pages → Settings → Environment variables, add these variables for the **Production** environment using the values in `.env.production.example`:

```text
VITE_APP_ENV=production
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6b07061f0034777d305d
VITE_APPWRITE_DATABASE_ID=6b07063d0036acb4f8fc
VITE_APPWRITE_MEALS_TABLE_ID=6b070649001b6534fcfc
VITE_APPWRITE_RATINGS_TABLE_ID=6b07077f001cdb2bff90
VITE_APPWRITE_CIRCLES_TABLE_ID=6b070eb8001c0f69789e
VITE_APPWRITE_STORAGE_BUCKET_ID=6b0708700022d260cfa5
```

Set the variables for Preview explicitly as well. With only two data spaces, the safe choice is to point Preview at the development project by copying `.env.development.example`; this keeps previews away from production but means preview users share development data. Do not deploy a Preview build without Appwrite variables.

After the Pages hostname exists, add it as a **Web** platform in the production Appwrite project under Apps. Add both the `*.pages.dev` hostname and any custom domain that will serve the app. Keep `127.0.0.1` only on the local Appwrite project.

## Appwrite schema

The development and production projects have the schema below. Add these attributes when provisioning another Appwrite project:

### `Meals`

| Column | Type | Required |
| --- | --- | --- |
| `name` | string | yes |
| `date` | string | yes |
| `recipe` | string | no |
| `note` | string | yes |
| `circle` | string | yes (empty means no group) |
| `imageId` | string | no |
| `addedBy` | string | yes |
| `ownerId` | string | yes |
| `dietaryTags` | string array | no |

### `Ratings`

| Column | Type | Required |
| --- | --- | --- |
| `mealId` | string | yes |
| `value` | integer, min 1, max 5 | yes |
| `valueHalf` | integer, min 1, max 10 | no (rating multiplied by 2) |
| `name` | string | yes |
| `initials` | string | yes |
| `color` | string | yes |
| `ownerId` | string | yes |

The optional `valueHalf` integer column is configured in both Ratings tables to persist half-star ratings. For a new project, add it with a minimum of 1 and maximum of 10.

The optional `dietaryTags` string-array column is configured in both Meals tables. When deploying against an older schema without this column, the app keeps dietary tags on the current device and saves the rest of the meal to Appwrite.

### `Circles` (displayed as Groups in the app)

| Column | Type | Required |
| --- | --- | --- |
| `name` | string | yes |
| `color` | string | yes |
| `ownerId` | string | yes |

### `Profiles` and `Notifications`

Group username lookup and invite notifications require the tables named by `VITE_APPWRITE_PROFILES_TABLE_ID` and `VITE_APPWRITE_NOTIFICATIONS_TABLE_ID`.

`Profiles` needs `userId` (string), `username` (string), and `displayName` (string). The app uses each account's Appwrite user ID as both the row ID and `userId`. Add a unique index on `username` for exact lookup and prefix suggestions. Enable Row Security, allow authenticated users to create rows, and let the app set row permissions so signed-in users can discover usernames while only profile owners can edit or delete their row.

`Notifications` needs `recipientId` (string), `type` (string), `senderId` (string), `senderName` (string), `circleId` (string), `circleName` (string), `membershipId` (optional string), and `read` (boolean). Add an index for `recipientId` and `$createdAt` (descending). Enable Row Security and allow authenticated users to create rows; the app restricts each notification row to its recipient.

Email/password Auth is enabled in both projects. The app opens on a real sign-in/create-account screen when the Appwrite variables are configured.

## Product surface

- Log a dish with its date, photo, optional structured recipe, group and note. Recipe data is stored in the existing `recipe` string as versioned JSON; older plain-text recipe links remain readable. Give the Appwrite string column enough capacity for a full recipe.
- Build recipes with servings, custom ingredient categories, measured ingredients and ordered steps. Link ingredients into steps so the detail view can scale both the ingredient list and linked amounts for a chosen number of servings, with metric or imperial units.
- Add dietary tags such as vegetarian, vegan, gluten-free, dairy-free, pescatarian, halal, kosher, keto and low-carb. Tags are user-entered labels, not allergen guarantees.
- Open any meal to see the average, distribution and individual ratings.
- Rate a dish from the detail drawer in half-star increments and update the average instantly.
- Browse the archive grouped by year and month, or use the Top rated view.
- Installable PWA shell with a manifest and offline cache for the app shell.
