# Data Schema (Projected Columns)

## `books` (List Projection)
| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable book identifier (`book_9to5`) |
| `slug` | `string` | URL-safe slug (`chatgpt-9-to-5`) |
| `title` | `string` | Editorial display title |
| `subtitle` | `string` | Concise 1-2 line summary |
| `gumroad_url` | `string` | Direct store link (`https://jameswalkerai.gumroad.com`) |
| `cover_thumb_url` | `string` | Local generated letterpress cover path |
| `total_chapters` | `number` | Total chapters in playbook |
| `free_chapters` | `number` | Free playable sample chapter count |
| `est_minutes` | `number` | Estimated playtime |
| `difficulty` | `string` | Audience level label |
| `category` | `string` | Topic domain |
| `version` | `number` | Cache-busting bundle version |

## `chapters` (On-Demand Bundle)
| Field | Type | Notes |
| --- | --- | --- |
| `book_id` | `string` | Foreign key to `books.id` |
| `book_slug` | `string` | Foreign key slug |
| `chapter_num` | `number` | 1-indexed chapter number |
| `title` | `string` | Chapter heading |
| `is_free` | `boolean` | Public access flag |
| `start_node_id` | `string` | Entry node key |
| `nodes` | `Record<string, ScenarioNode>` | Complete branching decision graph (`choice`, `prompt_boss`, `ending`) |

## `user_progress` (Local-First + Debounced Sync)
| Field | Type | Notes |
| --- | --- | --- |
| `readerId` | `string` | Anonymous client UUID |
| `xp` | `number` | Cumulative reader XP |
| `streakDays` | `number` | Consecutive active days |
| `skills` | `SkillStats` | `clarity`, `context`, `constraint`, `verification` |
| `unlockedBooks` | `string[]` | Redeemed book slugs |
| `unlockedCodes` | `string[]` | Validated Gumroad codes |
| `completedChapters` | `string[]` | Format `${bookSlug}:${chapterNum}` |
| `earnedRanks` | `Array<RankBadge>` | Shareable rank badges |
| `bookStates` | `Record<string, BookProgress>` | Current node & choice trail |
| `updatedAt` | `string` | ISO timestamp |
