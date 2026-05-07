# Feedback Analyzer System Diagrams

This document captures the main data model and user flows for the Feedback Analyzer project.

## Entity Relationship Diagram

The database has four core entities. Clubs own campaigns, campaigns receive feedback, and users can manage clubs or submit authenticated feedback.

```mermaid
erDiagram
  CLUBS ||--o{ USERS : manages
  CLUBS ||--o{ MATCHES : creates
  MATCHES ||--o{ FEEDBACK : collects
  USERS ||--o{ FEEDBACK : submits

  CLUBS {
    text id PK
    text name
    text normalized_name UK
    text npfl_id UK
    text logo_url
    text admin_email UK
    text status
    timestamptz submitted_at
    timestamptz review_due_at
    timestamptz reviewed_at
    text reviewed_by
    text rejection_reason
    boolean is_active
  }

  USERS {
    text id PK
    text email UK
    text role
    text club_id FK
    float credibility_score
    boolean is_blocked
    text status
    timestamptz approved_at
    timestamptz blocked_at
    text blocked_reason
  }

  MATCHES {
    text id PK
    text club_id FK
    text created_by
    text opponent
    text sharable_id UK
    text topic_type
    text subheading
    text subtitle
    timestamptz expires_at
    text audience
  }

  FEEDBACK {
    text id PK
    text match_id FK
    text user_id
    text original_text
    text translated_text
    text detected_language
    float sentiment_score
    float magnitude
    text category
    float credibility_score
    text justification
    jsonb entities
    boolean is_anonymous
    text validation_status
    jsonb quality_flags
    text owner_club_id
    text primary_subject_club
    timestamptz timestamp
  }
```

## Activity Diagram

The activity flow is split into the three main user paths: fan feedback, admin campaign creation, and super admin review.

```mermaid
flowchart TD
  subgraph FanFlow["Fan Feedback Flow"]
    F1([Open campaign link])
    F2[View campaign brief]
    F3[Enter feedback]
    F4[Submit feedback]
    F5{Valid feedback?}
    F6[Analyze sentiment and credibility]
    F7[Save feedback]
    F8([Show confirmation])
    F9([Show error])

    F1 --> F2 --> F3 --> F4 --> F5
    F5 -->|Yes| F6 --> F7 --> F8
    F5 -->|No| F9
  end

  subgraph AdminFlow["Club Admin Flow"]
    A1([Sign in])
    A2[Open admin dashboard]
    A3[Create campaign link]
    A4[Set subject, subtitle, audience, expiry]
    A5[Share generated link]
    A6[View insights]

    A1 --> A2 --> A3 --> A4 --> A5
    A2 --> A6
  end

  subgraph SuperAdminFlow["Super Admin Flow"]
    S1([Sign in])
    S2[Review club request]
    S3{Decision}
    S4[Approve club]
    S5[Reject club]

    S1 --> S2 --> S3
    S3 -->|Approve| S4
    S3 -->|Reject| S5
  end
```

## Use Case Diagram

The use case diagram groups actions by actor and keeps shared services separate.

```mermaid
flowchart LR
  subgraph Actors["Actors"]
    Fan((Fan))
    User((Authenticated User))
    Admin((Club Admin))
    SuperAdmin((Super Admin))
  end

  subgraph FanCases["Fan Use Cases"]
    FC1[Open campaign]
    FC2[Read campaign brief]
    FC3[Submit feedback]
    FC4[Receive confirmation]
  end

  subgraph UserCases["Authenticated User Use Cases"]
    UC1[Sign in]
    UC2[Submit identified feedback]
    UC3[Register club]
  end

  subgraph AdminCases["Club Admin Use Cases"]
    AC1[Create campaign link]
    AC2[Manage campaign settings]
    AC3[View analytics]
    AC4[Review feedback]
  end

  subgraph SuperAdminCases["Super Admin Use Cases"]
    SC1[Review club requests]
    SC2[Approve or reject clubs]
    SC3[Manage users]
  end

  subgraph Services["External Services"]
    Auth[[Neon Auth]]
    AI[[AI Analysis]]
  end

  Fan --> FanCases
  User --> UserCases
  Admin --> AdminCases
  SuperAdmin --> SuperAdminCases

  UserCases -.-> Auth
  AdminCases -.-> Auth
  SuperAdminCases -.-> Auth
  FC3 -.-> AI
  UC2 -.-> AI
```
