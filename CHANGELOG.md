## [unreleased]

### Features

- _(evals)_ Scaffold @december/evals package and task loader (#258)
- _(cli)_ Extract runHeadlessTask seam and add integration test suite (#265)
- _(cli)_ Restore console output streams and format headless events (#266)
- _(cli)_ Add structured CLI argument parsing and standard flag dispatch (#267)
- _(cli)_ Isolate readline steering queue during active interactive prompts (#268)
- _(cli)_ Add non-interactive CI/CD automation mode and pre-flight auth check (#269)
- _(cli)_ Implement standalone CLI handlers for logout and init commands (#270)
- _(cli)_ Stream thinking deltas and status events to stdout in headless mode
- _(cli)_ Refactor settings, enforce sandboxing and tasks mode (#298)
- _(cli)_ Refactor settings, enforce sandboxing and tasks mode (#298) (#299)

### Bug Fixes

- _(types)_ Fix child process listener types for typecheck verification
- _(cli)_ Parse CLI flags before console suppression in index.ts
- _(cli)_ Align standalone init command with TUI workspace file scaffolding
- _(cli)_ Expand BYOK provider models, fix agent error formatting, and update TUI styling
- _(cli)_ Expand BYOK provider models, fix agent error formatting, and update TUI styling (#271)
- Headless mode

### Other

- Remove subagents and transition to single-agent CLI architecture (#263)

### Refactor

- _(shared,tui)_ Address code review standards and queue helper deduplication (#246)
- _(test)_ Remove helpers subfolders and flatten helper files into test directory (#246)
- _(tools)_ Remove SubagentTool and spawnSubagent from ToolExecuteContext (#253)
- _(agent)_ Remove subagent spawning and subagent depth checks (#254)
- _(cli,tui)_ Clean up subagent tool registrations, formatters, and TUI status banners (#255)

### Documentation

- _(adr)_ Document single-agent architecture decision (#256)

### Testing

- _(packages)_ Standardize test structure for agent, tools, providers (#246)
- _(root)_ Add test:unit and test:integration scripts (#246)
- _(database)_ Add unit and integration test structure for database (#246)
- _(tui)_ Add unit and integration test structure for tui (#247, #248, #249)
- _(shared)_ Add unit and integration test structure for shared package (#246)
- Comprehensive unit and integration test architecture across packages (#246, #247, #248, #249) (#250)

## [0.2.20] - 2026-07-25

### Features

- _(home)_ Add get started section
- _(hero)_ Add get started section in home page (#217)
- _(wiki)_ Implement Prisma schema & backend wiki foundation (#220)
- _(wiki)_ Implement GitHub repo listing & unconnected CTA view (#221)
- _(wiki)_ Implement stubbed agent wiki generation workflow (#222)
- _(wiki)_ Implement wiki reader and page CRUD management (#223)
- _(wiki)_ Implement interactive WikiChat agent interface (#224)
- _(review/wiki)_ Add review and wiki module and refactor modules on standards (#227)
- Add lint and ci configs
- _(settings)_ Add settings sub pages ui
- _(ui)_ Add review/wiki page updates and settings sub-pages UI (#238)
- _(server)_ Implement rate limits and structured logging (closes #239)
- _(auth)_ Replace bcrypt with SHA-256 for refresh token hashing (#229)
- _(auth)_ Implement refresh token rotation grace period window (#229)
- _(auth)_ Add session caching to authMiddleware with immediate signout invalidation (#229)
- _(auth)_ Enforce strict rate limiting on public auth endpoints (#229)
- _(auth)_ Implement periodic cleanup job to purge expired and revoked sessions (#229)

### Bug Fixes

- _(hero)_ Fix agent switch and more options
- _(sessions)_ Fix sessions ui
- _(sessions)_ Fix sessions ui and insgihts modal
- _(sessions)_ Fix sessions module and ui (#218)
- _(review)_ Fix review module and ui
- Lint configs and auto lint
- Ci pipeline
- Review and wiki page
- _(types)_ Resolve type errors in web and cli to satisfy pre-push typecheck hook
- _(server)_ Resolve code review findings for rate limiting, retryAfter, and logger env
- _(server)_ Resolve code review findings for rate limiter and logger
- _(auth)_ Hardening & Optimization of Server Authentication Architecture (#229) (#245)

### Refactor

- _(server)_ Standardize all modules to match reference architecture (#225)
- _(server)_ Standardize service layer functions, single typed parameters, and exports (#226)
- _(auth)_ Apply code review polish to types, controllers, and test coverage

### Documentation

- Add testing and environment setup instructions to AGENTS.md
- Add server module architecture and service layer standards to AGENTS.md

### Miscellaneous Tasks

- _(release)_ V0.2.20

## [0.2.19] - 2026-07-21

### Features

- Implement uiux improvements for chat and missing dependencies
- Ui/ux improvements for chat and missing dependencies (#216)

### Testing

- Extensive test coverage for all cli domains
- Extensive test coverage for tools and providers

### Miscellaneous Tasks

- _(release)_ V0.2.19

## [0.2.18] - 2026-07-20

### Bug Fixes

- _(usage)_ Add usage redirect and .december workspace

### Miscellaneous Tasks

- _(release)_ V0.2.18

## [0.2.17] - 2026-07-19

### Bug Fixes

- _(handoff)_ Fix handoff and sign url upload to s3
- _(cli)_ Remove stub hooks and fix headless login
- _(cli)_ Fix cli tests:
- _(cli)_ Fix handoff and headless login (#212)

### Testing

- _(cli)_ Add test for cli configs and sessions

### Miscellaneous Tasks

- _(release)_ V0.2.17

## [0.2.16] - 2026-07-18

### Features

- Implement browser DI, add missing CLI tools, and lowercase comments
- Agent tools architecture and test expansion (#209)

### Testing

- _(agent/provider)_ Add test to agent and provider

### Miscellaneous Tasks

- _(release)_ V0.2.16

## [0.2.15] - 2026-07-17

### Miscellaneous Tasks

- _(release)_ V0.2.13
- _(release)_ V0.2.15

## [0.2.14] - 2026-07-17

### Miscellaneous Tasks

- _(release)_ V0.2.14

## [0.2.13] - 2026-07-17

### Features

- _(phase0)_ Database migration, settings cleanup, and monorepo typecheck fixes (#207)
- _(sessions)_ Add session page ui
- _(sessions)_ Add sessions crud and fix sessions ui" (#208)

### Bug Fixes

- _(sessions)_ Fix sessions page, add filters
- _(sessions)_ Link endpoint and add insights option
- _(sidecar and vm)_ Add sidecard and vm boots scripts

### Refactor

- _(lint)_ Lint check

### Miscellaneous Tasks

- _(release)_ V0.2.13

## [0.2.12] - 2026-07-17

### Features

- _(db)_ Change schema as session first approach and auth fix
- _(sessions)_ Sessions migration
- _(sessions)_ Sessions migration (#206)

### Bug Fixes

- _(auth)_ Db migrations fix and merge device flow

### Other

- _(db/auth)_ Fix auth and device code and alter projects into sessions (#205)

### Refactor

- _(server)_ Migrated from project based to session based

### Miscellaneous Tasks

- _(release)_ V0.2.12

## [0.2.11] - 2026-07-15

### Features

- Agent settings in CLI and comprehensive agent tests
- Agent settings in CLI & comprehensive agent tests (#196)
- Add byok fallback config and email display ; log vai december

### Bug Fixes

- _(chaitanya)_ Fix cli renderer err" (#201)
- _(agent)_ Congif overrides
- Comprehensive session persistence and TUI UX fixes
- Comprehensive session persistence and TUI UX fixes (#203)

### Documentation

- Mark Phase 1 and 2 items as complete in AGENTS.md

### Testing

- _(tools)_ Add test to tools
- _(providers)_ Add test to providers, wrap in factory pattern
- _(tui)_ Add test in tui

### Miscellaneous Tasks

- _(release)_ V0.2.11

## [0.2.10] - 2026-07-14

### Miscellaneous Tasks

- _(release)_ V0.2.10

## [0.2.9] - 2026-07-14

### Features

- Implement session architecture
- Implement session architecture (#193)

### Miscellaneous Tasks

- Add remaining refactor and formatting changes
- _(release)_ V0.2.9

## [0.2.8] - 2026-07-13

### Features

- Improve uiux
- Reviews page

### Bug Fixes

- _(tui)_ Fix chat interface and multi loader (#188)

### Miscellaneous Tasks

- _(release)_ V0.2.8

## [0.2.7] - 2026-07-12

### Features

- Improve authflow
- Settings page
- Search agent

### Bug Fixes

- _(ui)_ Fix ui and added zustand, fix mobile view (#186)
- _(tui/cli)_ Refactor bloat and fix quota key err (#187)

### Miscellaneous Tasks

- _(release)_ V0.2.7

## [0.2.6] - 2026-07-11

### Bug Fixes

- _(cli)_ Add robust init command and resolve TUI layout bugs

### Miscellaneous Tasks

- _(release)_ V0.2.6

## [0.2.5] - 2026-07-11

### Features

- Context dipslay
- _(cli)_ Add cmds and impl context display (#184)
- Grillme cmd
- Tasks, settings and resume mcd
- _(cmds)_ Add advance cmds like grill me , settings, hooks, tasks and resume (#185)

### Miscellaneous Tasks

- _(release)_ V0.2.5

## [0.2.4] - 2026-07-09

### Features

- Complete GitHub OAuth login and auto-connect integration
- Integrate github oauth login (#170)
- Add API rate limit retries, OpenRouter model fetching, and TUI session resume
- API rate limit retries, OpenRouter model fetching, and TUI session resume (#179)
- Selector and npm info
- _(tui)_ Polish TUI command menu, input layouts, and fix bash description
- _(tui)_ Polish command menu, input layouts, and fix bash description (#180)

### Bug Fixes

- Add OpenRouter model fallbacks and restore full tool blocks on resume

### Miscellaneous Tasks

- _(release)_ V0.2.4

## [0.2.3] - 2026-07-05

### Features

- Added openai, anthropic and gemmni provider
- _(agent)_ Added custom proviiders and model selection #162
- Add fumadocs
- _(agent)_ Add proxy cmds and fix agent outet steer loop
- _(providers)_ Add providers (#166)
- _(auth)_ Login via december in cli; browser and w/code
- _(auth)_ Login via december in cli; browser and w/code (#168)

### Bug Fixes

- _(agent)_ Fix agent loop and esc agent and improve tui #164

### Miscellaneous Tasks

- _(release)_ V0.2.3

## [0.2.2] - 2026-07-01

### Miscellaneous Tasks

- _(release)_ V0.2.2

## [0.2.1] - 2026-07-01

### Miscellaneous Tasks

- _(release)_ V0.2.1

## [0.2.0] - 2026-07-01

### Features

- Agent loop and cli iteration
- _(agent)_ Add agent loop and fix cli iteration #161

### Miscellaneous Tasks

- _(release)_ V0.2.0

## [0.1.7] - 2026-06-30

### Bug Fixes

- _(ui)_ Improve sidebar visuals with color change, tooltip, and search #157

### Miscellaneous Tasks

- _(release)_ V0.1.7

## [0.1.6] - 2026-06-26

### Features

- Add payments via razorpay and coinbase
- _(billing)_ Add wallet based credits instead of subscription based #117
- Direct deploy via vercel
- _(platform)_ Direct deploy via vercel and fix github + vercel deploy flow
- Implement project collaboration, runtime fixes, publish tab, and extensive tests #149

### Bug Fixes

- _(generattion)_ Fix scaffold paths; mv to runtime #113

### Testing

- _(canavas/notification/import/profile)_ Add test unit and integration #110
- Billing module

### Miscellaneous Tasks

- _(release)_ V0.1.6

## [0.1.5] - 2026-06-22

### Testing

- _(auth)_ Add auth tests #103
- _(canvas)_ Added tests #105

### Miscellaneous Tasks

- _(release)_ V0.1.5

## [0.1.4] - 2026-06-17

### Features

- _(tui)_ Add dropdwon and prompt box in tui
- _(tui)_ Added screens and polish tui
- _(tui)_ Add december tui and main screen mock up #96

### Bug Fixes

- _(db)_ Env load err

### Miscellaneous Tasks

- _(release)_ V0.1.4

## [0.1.3] - 2026-06-16

### Testing

- _(canvas)_ Fix and tested canvas module
- _(canvas/integration/upload)_ Fix and tested modules #93

### Miscellaneous Tasks

- _(release)_ V0.1.3

## [0.1.1] - 2026-06-15

### Features

- Init december cli

### Refactor

- _(module)_ Fix types and inline destructure and types files

### Miscellaneous Tasks

- _(release)_ V0.1.1

## [0.1.0] - 2026-06-14

### Features

- _(auth)_ Add user authentication(#8)
- Auth middleware
- GetProfile endpoint
- Add profile
- _(profile)_ Add getprofile and update profile(#9)
- Add update name and change pass
- Auth
- Profile
- _(ui)_ Init react project/bun
- Projects crud endpoints
- _(project)_ Add projects crud endpoints(#11)
- Ui and canvas
- _(ui)_ Redesign components and canvas context
- Login w/ google route
- Oauth
- Opt verification
- Resend OTP email
- _(oauth)_ Add google login and otp verification
- _(auth)_ Add oauth login and otp verification (#17)
- _(tanstack)_ Connect ui w/ server and implemented optimistic ui updates (#19)
- _(profile)_ Github connect
- _(profile)_ Github integration
- _(profile)_ Implemented github integration and repo sync #21
- Webclipper and playwright
- _(canvas)_ Implemented web clipper
- _(canvas)_ Implemented web clipper #22
- Notification pref
- _(profile)_ Add notification email toggle
- _(profile)_ Implemented email notification and updates #23
- _(project)_ Add duplicate project
- Add sub agents
- Code mirror editor
- _(agent/editor)_ Implemented subagents and config code mirror editor #24
- Prompt validation
- Intent agent to get stritct json intent
- _(agent)_ Implemented intent agent that parse prompt into struct json object with deterministic values#25
- _(agent)_ Implemented planner and dependency agent #26
- _(project)_ Implemented option to duplicate project
- _(project)_ Duplicate opt and projects skeleton ui
- _(project)_ Implemented duplicate project opt and refine skeleton ui #27
- Build agent output struct parse
- Db implemnetd query
- Implemented build agent and db connection verify modal #30
- _(agent)_ Add stream to chat of prompt and plan agent #33
- _(agent)_ Implemented build agent and file streams
- _(agent)_ Implement build agent and code streaming to file exp #34
- Implemented obj storage and tested
- Setup and tested object storage (/minio) #35
- Implemented save code and chat in obj storage/s3 and db #36
- _(agent)_ Implemented fix and edit agent
- _(agent)_ Implemented fix and edit agent #37
- Implement runtime service, obj store -> runtime
- Preview generated web
- _(runtime)_ Add preview and runtime
- _(runtime)_ Add runtime and preview and refactor gen service into more modular files #39
- Add cliper and canvas state persist
- Implemented clipper and canvas state mutation on ui
- _(canvas)_ Implement state persist canvas and add web clipper mutation
- _(canvas)_ Add state persist canvas and web clipper to ui/canvas #44
- _(community)_ Add v0 version of community page
- _(templates)_ Add community templates page
- _(templates)_ Add community templates page frontend and struct the remix option over each templates ref v0/templates #45
- _(import)_ Add import github and codebase opt
- _(setup)_ Add eslint and husky setup #47
- _(project)_ Project sharing as template and restructure remix #53
- _(upload)_ Impl listgithub repos and download zip from url #61
- _(upload)_ Minio code upload of zip and repo #64
- _(templates)_ Add CRUD and like/dislike routes for templates page #65
- _(auth/profile)_ Access and refresh token and sessions, add delete acc and signout all sessions routes #67
- _(template)_ Impl remix template w/ direct copy #72
- Notifications
- _(billing)_ Add razorpay integration and fix billing and usage ui #77
- _(outputscreen)_ Add COT (chain of thoughts) and runtime logs #80
- _(usage)_ Token usage extraction and add model selector in chatbar promptbxo
- _(template)_ Add preview via image for templates
- _(template)_ Add preview image feat in template page; #87
- Create and update repo via gh-api
- _(interation)_ Impl vercel auto deploy integration
- _(integrations)_ Add vercel auto deploy and github auto repo and push integration #88
- Add feedback persist in db

### Bug Fixes

- Profile endpoints
- _(ui)_ Ui #15 from phasehumans/chaitanya/ui-redesign
- Auth module and err handling
- Types and messages
- _(module)_ Fix modules and setup code-gen(#16)
- Google service
- Update project route
- _(projects)_ Projects isStarred and add project status (#18)
- Plugins
- Pen tool, added tool select feat
- Pen smoothing and kbd shortcuts
- Shapes container and point eraser
- _(canvas)_ Enable tools and implment fn like excalidrw #20
- Screen redirect from github
- Clipper bun, spawn node worker
- _(project)_ Layout change and hover fix
- _(ide)_ Folder added and collpase fn
- File exp collapse and active tab
- _(ide)_ Implemented active files and better file explorer with collapse folders and files #28
- Chat bar and implemented capusle w/ chat and preview tab
- Preview screen err and tab switch
- _(output screen)_ Implemented new layout and fix prev. err in output screen in mobile view mode #29
- Updated layout of settings page
- Err message and err state
- Prompt and plan agent res struct
- Updated video card theme and preview
- Animation laoder and bg
- Build agent content parser and input struct
- Add strict types for agent response
- Stream output of agents
- Updated layout of chatbar and change stream flow
- Json parser w/ custom parser
- Custome parser
- Build agent max token
- Auto tab switch betn agent calls
- Rust linker'
- Project version and project page schema err
- _(generation)_ Refactor agent scope just for frontend
- _(generation)_ Refactor agent scope just for frontend #38
- Normalize msg err handler for token-limit
- Prompt agent system calls
- Prompt agent chat msg, use reactive/self approach
- _(agent/chat)_ Improved prompt agent chat message stream #40
- Plan agent stream plan
- Plan agent stream chat and add coT to think agent
- _(agent)_ Add coT / chain of thought to prompt agent and explcit plan struct stream from plan agent #41
- Prompt and plan agent contracts mismatch
- \*\* bullet render from plan agent chat stream
- _(agent)_ Align the agents contract and schema validation #42
- Node worker process web clipper
- Agents contract
- Payload size err
- Clipper blank space load err
- Categoires cards and community page section
- Tsconfig baseurl upadte
- Hero section and o-screen project name
- Home section header
- _(ui)_ Add github and upload project section and improved icons consistency #46
- Improve ui sidebar
- _(sidebar)_ Imporve the ui of sidebar #50
- _(hero/canvas)_ Improved the hero section and canvas position, add slider #51
- _(auth)_ Improved auth modal and CTA pill #52
- Updated project version and canvas state #54
- Runtime and docker sandbox issue
- Blocking paths
- Docker container pull err
- _(runtime)_ Blocking path err and setup exec image #55
- _(home)_ Improved sidebar recent project section and add github repo and code upload form #56
- Github and upload proj forms
- Canvas cards and shadows
- _(hero/canvas)_ Updated canvas ui and fix github forms #58
- _(agents)_ Impl 3 agents arch. #59
- Wsl and postman binding err
- Outputscreen headers and chatsection
- _(outputscreen)_ Fix output screen headers and code editor issues #62
- File parser and extract zip
- _(outputscreen)_ Fix container and add options forms #63
- Error handler and add test script
- Auth middleware; bearer and cookie fallback
- Settings sidebar
- _(profile/settings)_ Ui updation and add integration, billing and usage section #69
- _(projects)_ Add tests and ui for project and routes handlers #70
- CRUD template routes
- _(template)_ Improve template ui and refactor template routes #71
- Replace jwt based to session bases, add guards
- _(auth)_ Replace jwt based auth frontend with session based, remove project mocks #73
- _(sidebar/main)_ Impl modal selector and fix logos and items #74
- Projects route api contracts
- Remove mock template and fix api contacts
- _(project/template)_ Remove mock data and impl api contacts for projects and template #75
- _(agent)_ Update agent config #76
- Outputscreen rollback and error logs #78
- _(outputscreen)_ Add settings modal and fix code editor #79
- _(ui)_ Split into sub components and minor ui fix
- _(plan agent)_ Plan agent cot and plan of action, update cot and poa display in chatbar #83
- Followup edits and add user onboarding #85
- _(view)_ Fix template preview and add email onboarding #86
- _(credits/memory)_ Fix usage and model based credit tracking, impl memory session based and project based #89

### Other

- Portfolio
- Quiz app
- Dairy website
- Countdown timer
- Color picker
- Form validation
- Sidebar and prompt input
- Sidebar collpase state

### Refactor

- _(ui)_ Components(#12)
- Docker setup
- Split into modular sub components:
- _(server)_ Modules generation and deploy
- _(web)_ Split into subcomponents
- Runtime
- _(runtime)_ Rust runtime
- Split generation service file
- Err handler states and proxy
- _(setup)_ Add dev files
- Integration test and removed route tests
- _(agents)_ Generation flow and agent contracts #60
- Split into sub components
- Impl softdelete check on middleware
- Move deploy routes into platform module
- _(sever)_ Extract types and redundant soft delet check
- Moved aws storage interface files to shared

### Documentation

- Del contribution
- Update changelog for v0.1.0

### Testing

- _(agent)_ Test and fix agent based on fs stream #31
- Minio object storage and fix
- Add auth schema test for signin and login
- _(auth/profile)_ Add unit and integration test for auth and profile module w/ bun test #48
- _(project/canvas)_ Add unit and integration test for project and canvas #49
- _(auth)_ Service and route integration test #66
- _(auth/profile)_ Add soft delete and tested auth and profile module; unit & integration tests #68
- _(auth)_ Add more test in auth module
- _(profile)_ Add tests in profile module
- _(project)_ Add unit and integration tests
- _(project)_ Tested project module and add feedback persist
- _(template)_ Add tests and lint fix
- _(template)_ Add tests unit and integration; removed previewHTML from template card #91

### Miscellaneous Tasks

- Initialize changesets
- Add initial changeset
- Remove changesets
- Configure git-cliff
- Add changeset
- Add release automation
- _(release)_ V0.1.1
- Configure .devcontainer and project workspace settings
- Add ai skills and prompts to .december workspace
- Add more ai skills and prompts to .december
- Rename and refine ai skills and prompts
- _(release)_ V0.2.0
- _(release)_ V0.2.0
- _(release)_ V0.2.1
- _(release)_ V0.2.1
- _(release)_ V0.2.2
- _(release)_ V0.3.0
- _(release)_ V0.3.1
- _(release)_ V0.1.0
- _(release)_ V0.1.0
