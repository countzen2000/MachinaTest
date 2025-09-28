
Hi, thanks for giving me oppurtunity to work on this. 

# Part 1:
## Some Assumptions
First, my assumptions at this time:

1. Future growth of roles coming, perhaps multiple level of engineers
2. We are NOT doing a time-log of the machine use, a snapshot of current time of use is good enough for this exercise
3. REST API is good, not going into GraphQL, Protobuff, etc. (Expecting JSON style input/output)
4. CAD files and config files are stored externally, perhaps in S3/Cloud for sharing across machines and users
5. Authentication is handled internally, not requires to do SSO or LDAP, etc.

## API Design:

### More traditional Organization:
#### Projects:
- POST /projects
	- For creating new Projects
- GET /projects?status=(Active|None|Completed|etc)&start=<date>&end=<date>
	- For getting projects, with optional filters for status of project, and optional date filter
- PUT/PATCH /projects/{project_id}
	- Updating Projects parameters and configurations
- DELETE /projects/{project_id}
	- Deleting projects, Probably soft delete for future, as well as regulations
- GET /projects/{project_id}
	- get list of projects and optional ID for details on that particular project

#### Cells:
- GET /cells/{cell_id}
	- List of cells and their status, optional cell_id for detailed output
- Get /cells/utilization?at=<timestamp>
	- % utilization of cells, at a certain snapshot time stamp, return data either calculated or with extra metadata
-  POST /cells
	- Register a new cell
-  DELETE /cells/{cell_id}
	- Delete a cell

#### User Management:
- POST /users
	 - for creating new users
- POST /users/login 
	- Logging in
- POST /users/logout 
	- Logging out
- GET /users?role=(Engineer?)&active=True|False
	- Convinience filters for getting list of users, for a certain role and active
- GET /users/{user_id}
	- get users and optional id for details user info
- POST/PATCH /users/{user_id}
	- Update user data
- DELETE /users/{user_id}
	- Delete a user (most likely soft delete)\

---

### Organized from user point of

#### User Auth
- POST /users/login 
	- Logging in
- POST /users/logout 
	- Logging out
- POST /users
	 - for creating new users

#### Engineers view point:
- POST /projects
	- For creating new Projects
 GET /projects/{project_id}
	- get list of projects and optional ID for details on that particular project
- PUT/PATCH /projects/{project_id} 
	- Updating Projects parameters and configurations
- DELETE /projects/{project_id}
	- Deleting projects, Probably soft delete for future, as well as regulations
- GET /cells/{cell_id}
	- Get detailed info for a particular cell
- DELETE /cells/{cell_id}
	- Delete a cell (Soft delete most likely)
- POST /cells
	- Register a new cell

#### From Supervisor viewpoint:
- GET /users?role=(Engineer|something else)&active=(True|False)
	- Convinience for getting list of users, for a certain role and actives
- GET /users{user_id}
	- Get data for a specific user	
- POST/PATCH /users/{user_id}
	- Update user data
- DELETE /users/{user_id}
	- Delete a user (most likely soft delete)
- GET /projects?status=(Active|None|Completed|etc)&start=<date>&end=<date>
	- For getting projects, with optional filters for status of project, and optional date filter

#### From Dept Head view point:
- GET /cells/utilization?at=<timestamp>
	- % utilization of cells, at a certain snapshot time stamp, return data either calculated or with extra metadata
- GET /projects?status=(Active|None|Completed|etc)&start=<date>&end=<date>
	- For getting projects, with optional filters for status of project and optional date filter (This is a repeat of above, both supervisor and Dept head will use this endpoint)
	
## ERD and thoughts

### Thoughts on this
- Almost everything is soft deleted (either through active flag or is_deleted flag), in order to maintain data for audting and compliance. Dealing with fed/state requirments has audting going back a long time. We can talk about archiving if the DB gets too big.
	- This adds some complications for cascading deletes and such, but worth the complications for compliance
- I made Project Status a seperate table, since I am thinking in the future there might something attached to either GOV, or particular clients that are special (i.e. secret, hidden, deleted, archived, etc.)
- There will unknown parameters in the future, so, parameters are its own table.
- In spirit of auditing and compliance, parameter changes SHOULD be recorded on a seperate table, but will skip to keep this simple for this exercise.

### The ERD diagram
** If your markdown viewer down't support Mermaid, you can see the image from lucid charts here: 

``` mermaid
---
title: Cells ERD
---
erDiagram
    Users {
      uuid user_id PK
      text name
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    Roles {
      uuid role_id PK
      text name
      text type
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    UserRoles {
      uuid user_role_id PK
      uuid user_id FK
      uuid role_id FK
      timestamptz granted_at
      timestamptz updated_at
    }
    Cells {
      uuid cell_id PK
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    Projects {
      uuid project_id PK
      uuid engineer_id FK
      uuid cell_id FK
      uuid status_id FK
      timestamptz updated_at
      timestamptz created_at
      boolean is_deleted
    }
    Project_Files {
      uuid file_id PK
      uuid project_id FK
      text name
      text type
      text location_url
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    Project_Parameters {
      uuid param_id PK
      uuid project_id FK
      text name
      text type
      numeric value
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    Project_Status {
      uuid status_id PK
      text name
      text type
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    Users ||--o{ UserRoles : has
    Roles ||--o{ UserRoles : assigned_to
    Users ||--o{ Projects : engineer_of
    Cells ||--o{ Projects : hosts
    Project_Status ||--o{ Projects : status_of
    Projects ||--o{ Project_Files : has
    Projects ||--o{ Project_Parameters : has
```
