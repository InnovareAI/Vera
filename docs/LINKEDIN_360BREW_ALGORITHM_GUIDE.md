# LinkedIn 360Brew Algorithm: Technical Guide & Implementation Rules

## Overview

LinkedIn's **360Brew** (V1.0 released late 2024, wide rollout 2025) is a unified AI foundation model (150B parameters) that replaces thousands of fragmented recommendation algorithms with a single "LMM" (Large Model for Matching).

Unlike previous iterations that relied on keywords and metadata, 360Brew performs **Semantic Reasoning**. It reads, understands, and matches users based on the *meaning* and *context* of their profiles and content.

---

## 🧠 The 4 Pillars of 360Brew

### 1. Unified LMM (Large Model for Matching)

* **Old Way**: Separate models for Feed, Search, Job Matching, and Connection Suggestions.
* **360Brew Way**: One model "reads" every profile and post. It creates a high-dimensional vector space where "Authority" is calculated by the distance between your Profile Expertise and your Content Topic.
* **SAM Implementation**: All outreach MUST be informed by the prospect's profile context. Generic templates are now filtered by LinkedIn as "low-value noise".

### 2. Semantic Personalization (Reach vs. Relevance)

* **The Algorithm**: Rewards "Nose-to-Content" alignment. If a CISO posts about security and a Security Vendor comments, the reach is 5x higher than if a generic recruiter comments.
* **SAM Implementation**: The Orchestration Agent must prioritize **Topical Authority**. Only Outreach and Commenting that matches the prospect's semantic cluster will achieve high visibility.

### 3. Meaningful Engagement (The "10+ Word" Rule)

* **The Algorithm**: Simple "Likes" are nearly worthless. "Saves" are the #1 organic signal (5x power). Thoughtful comments (minimum 10-15 words) are rewarded with feed injection.
* **SAM Implementation**: The Commenting Agent must NEVER generate "Great post!" or "Agree!". Every comment must use the **ACA+I Framework** (Acknowledge, Add Insight, I-statement).

### 4. Relationship Intelligence (Delayed Rewards)

* **The Algorithm**: 360Brew tracks "Engagement Sessions". If a user likes 3 posts from you in a week, you are officially in their "Nurture Circle".
* **SAM Implementation**: Content generation should follow a 1-3-1 pattern: 1 Insightful Post, 3 Thoughtful Comments on others, 1 DM Follow-up.

### 5. Language Purity (Account Integrity)

* **The Algorithm**: 360Brew penalizes accounts that show "erratic switching" of primary languages. An English-profile account commenting in Spanish or Portuguese is often flagged as "automated spam" or "hacked account".
* **SAM Implementation**: All Discovery and Generation layers now enforce **English-only** checks. Non-English posts are auto-skipped at discovery to protect account reputation.

---

## 🛠 Strategic Implementation Rules for SAM Agents

| Agent | 360Brew Requirement | Implementation Rule |
| :--- | :--- | :--- |
| **Campaign Agent** | High Relevance | Use Claude 3.5 Haiku to bridge **Prospect Profile** + **Company Website** research into every first message. |
| **Commenting Agent** | >10 Words + Value | Reject any response < 15 words. Must use **Fact Extraction** to reference specifics from the post content. |
| **Orchestration Agent** | Holistic 360 Sync | Coordinate across commenting, posting, and DMing to build "Topical Authority" for the user's profile. |
| **Intelligence Layer** | Semantic Matching | Use vector similarity to ensure the content being generated matches the user's **Brand Guidelines**. |
| **Integrity Layer** | Language Purity | Enforce **English-only** content to maintain account reputation and avoid spam flags. |

---

## 🚫 360Brew Red Flags (Avoid These)

1. **Hashtag Stuffing**: Meaningless now. LMM reads the full text.
2. **Engagement Pods**: Detected via session timing and pattern matching.
3. **Low-Dwell Content**: Polls (without context) or short "bait" posts.
4. **Generic DMs**: 360Brew tracks recipient response rates. Low response rates = "Ghosting filter" for your account.
5. **Language Mismatch**: Commenting in a language that doesn't match your primary profile settings.

---

*Compiled Research for SAM AI Platform - Jan 22, 2026*
