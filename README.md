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
- Profiles table: `6b081324001711e0c487`
- Notifications table: `6b0813c8000f8f3ce7fa`
- Photo bucket: `6b0708700022d260cfa5`
- Email/password authentication: enabled

The two spaces have separate users, meals, ratings, profiles, notifications, and photos because they belong to separate Appwrite projects.

Production database operations go through the same-origin `/api/private-data` Worker endpoint. It verifies the signed-in user's Appwrite JWT and checks the meal owner, group membership, group admin, or notification recipient before using the server-only `APPWRITE_API_KEY`. The key must be a Cloudflare **runtime secret**, never a `VITE_` or build variable. Use only these API key scopes: `rows.read`, `rows.write`, `teams.read`, `teams.write`, `files.read`, and `files.write`.

For the production Appwrite project, enable Row Security on `Meals`, `Ratings`, `Circles`, `Profiles`, and `Notifications`, then remove their table-level permissions. The Worker uses the API key for all table writes, so it does not need table-level user grants. Row permissions still protect direct Appwrite requests: meal and rating owners plus their group team can read; only owners can update/delete; profile rows are owner-only (username suggestions run through the authenticated Worker endpoint); notifications are readable by the recipient and sender; groups are readable by their members and manageable by their admin. Enable File Security on the photo bucket and remove bucket-wide access so each image follows its owner/group file permissions.

## Cloudflare Workers

The `ratemyplate` Worker is linked to this repository and deploys the `prod` branch. Configure these build variables in the Cloudflare build settings using `.env.production.example`:

```text
VITE_APP_ENV=production
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6b07061f0034777d305d
VITE_APPWRITE_DATABASE_ID=6b07063d0036acb4f8fc
VITE_APPWRITE_MEALS_TABLE_ID=6b070649001b6534fcfc
VITE_APPWRITE_RATINGS_TABLE_ID=6b07077f001cdb2bff90
VITE_APPWRITE_CIRCLES_TABLE_ID=6b070eb8001c0f69789e
VITE_APPWRITE_PROFILES_TABLE_ID=6b081324001711e0c487
VITE_APPWRITE_NOTIFICATIONS_TABLE_ID=6b0813c8000f8f3ce7fa
VITE_APPWRITE_STORAGE_BUCKET_ID=6b0708700022d260cfa5
```

In the Worker runtime settings, add `APPWRITE_API_KEY` as a **secret**, using a production Appwrite key with only the scopes listed above. Do not put it in build variables or `.env.production.example`. The project hostname `ratemyplate.kabunzki.workers.dev` must be registered as a Web platform in Appwrite.

Production and local builds should use their matching project variables from `.env.production.example` and `.env.development.local`. Keep the local Appwrite project separate from the production Worker.

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
