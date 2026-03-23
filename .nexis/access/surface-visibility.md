# Grant Engine — Surface Visibility

*Subnetwork ID: grant-engine | Generated: 2026-03-22*

---

## Per-Surface Visibility Table

### `member_frontend` — Grant Applicant Dashboard
| Property | Value |
|---|---|
| Surface Class | MEMBER_FRONT |
| Who can access | All tiers |
| Why it exists | Primary interface for all grant-engine users |
| Companion may reference | Yes |
| Member-safe | Yes |

---

### `companion_guidance` — Grant Companion
| Property | Value |
|---|---|
| Surface Class | COMPANION_GUIDANCE |
| Who can access | All tiers |
| Why it exists | AI-assisted support for grant applicants and coordinators |
| Companion may reference | Yes (this is Companion's own surface) |
| Member-safe | Yes |

---

### `application_dashboard` — Application Dashboard
| Property | Value |
|---|---|
| Surface Class | MEMBER_FRONT |
| Who can access | All tiers |
| Why it exists | Application status and management — applicants track their submissions here |
| Companion may reference | Yes |
| Member-safe | Yes |

---

### `document_upload_flow` — Document Upload Flow
| Property | Value |
|---|---|
| Surface Class | MEMBER_FRONT |
| Who can access | All tiers |
| Why it exists | Grant document submission surface — applicants upload required materials here |
| Companion may reference | Yes |
| Member-safe | Yes |

---

### `status_tracker` — Application Status Tracker
| Property | Value |
|---|---|
| Surface Class | MEMBER_FRONT |
| Who can access | All tiers |
| Why it exists | Real-time application status — applicants track review progress |
| Companion may reference | Yes |
| Member-safe | Yes |

---

### `local_support_tools` — Grant Support Tools
| Property | Value |
|---|---|
| Surface Class | ADMIN_OPERATIONAL |
| Who can access | STAFF, ADMIN, EXECUTIVE |
| Why it exists | Internal support queue for resolving applicant issues in grant-engine |
| Companion may reference | No |
| Member-safe | No |
| MEMBER access | Denied |

---

### `local_admin_tools` — Grant Admin Tools
| Property | Value |
|---|---|
| Surface Class | ADMIN_OPERATIONAL |
| Who can access | ADMIN, EXECUTIVE (STAFF: view/observe only) |
| Why it exists | Admin interface for grant management and coordination workflows |
| Companion may reference | No |
| Member-safe | No |
| MEMBER access | Denied |
| STAFF access | View/observe only (limited) |

---

### `template_manager` — Template Manager
| Property | Value |
|---|---|
| Surface Class | ADMIN_OPERATIONAL |
| Who can access | ADMIN, EXECUTIVE only |
| Why it exists | Manages grant application templates — shapes the applicant intake forms |
| Companion may reference | No |
| Member-safe | No |
| MEMBER access | Denied |
| STAFF access | Denied (admin+ only for this surface) |

---

### `backend_ops` — Grant Backend Ops
| Property | Value |
|---|---|
| Surface Class | **BACKEND_OPERATIONAL** |
| Who can access | ADMIN (limited), EXECUTIVE only |
| Why it exists | Backend system access for grant-engine infrastructure and data pipelines |
| Companion may reference | No — never |
| Member-safe | No — **MEMBER hard denied** |
| MEMBER access | **HARD BOUNDARY — absolutely prohibited** |
| STAFF access | **Denied** |
| ADMIN access | Limited (view, use, configure only) |

---

### `local_incidents` — Grant Incident Records
| Property | Value |
|---|---|
| Surface Class | ADMIN_OPERATIONAL |
| Who can access | STAFF (view/observe), ADMIN, EXECUTIVE |
| Why it exists | Incident tracking and resolution for grant-engine operational events |
| Companion may reference | No |
| Member-safe | No |
| MEMBER access | Denied |

---

*[ SURFACE VISIBILITY | GRANT ENGINE | 2026-03-22 ]*
*Source: `.nexis/access/surface-map.json` + `identity/permissions/registry/surface-registry.json`*
