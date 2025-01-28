## [1.0.1](https://github.com/johnlindquist/ghi/compare/v1.0.0...v1.0.1) (2025-01-28)


### Bug Fixes

* improve package description ([af6193b](https://github.com/johnlindquist/ghi/commit/af6193b642d08a15fcf43921a291922799d3d2d2))

# 1.0.0 (2025-01-28)


### Bug Fixes

* **deps:** add globals package for eslint ([ff90fd2](https://github.com/johnlindquist/ghi/commit/ff90fd2feb07957032f05a84c855aa3129ebd555))
* **eslint:** allow node globals and enforce no unused vars ([49d178d](https://github.com/johnlindquist/ghi/commit/49d178d79cf79ef748878d5b33f06be72292b73a))
* **eslint:** migrate to flat config and update husky hook ([510cebe](https://github.com/johnlindquist/ghi/commit/510cebe56798cf530d0324bc8052f28ac24546b6))
* **hooks:** run build:check before eslint ([173792a](https://github.com/johnlindquist/ghi/commit/173792aa0cf36dbabbfba88286a98801f3ed3724))
* **husky:** ensure deps are installed before running checks ([ce2c5db](https://github.com/johnlindquist/ghi/commit/ce2c5db591bcee4d5a79f2ab7696865ff3f90791))
* **husky:** update eslint command for flat config ([21385c8](https://github.com/johnlindquist/ghi/commit/21385c85c40acfe6996a5b445378af6128dbea49))
* **lint:** add eslint and fix typescript errors ([ecde738](https://github.com/johnlindquist/ghi/commit/ecde738fe8f8e4ad50dd86924b5bf046de3a345c))
* update ESLint config to use flat config format for ignores ([bc870a4](https://github.com/johnlindquist/ghi/commit/bc870a442216f7f21661557396300d7d819d1f53))


### Features

* initial setup ([e06d36e](https://github.com/johnlindquist/ghi/commit/e06d36efbd7632f33ec03840d29b84d31eaa839c))

# [1.1.0](https://github.com/johnlindquist/ghx/compare/v1.0.0...v1.1.0) (2025-01-24)


### Features

* **cli:** add --help flag with search options and examples ([a7bf5b8](https://github.com/johnlindquist/ghx/commit/a7bf5b8a45b90189a9e05bb31601d4fc8cf80a6c))

# 1.0.0 (2025-01-24)


### Bug Fixes

* add GitHub Actions permissions ([aeeee75](https://github.com/johnlindquist/ghx/commit/aeeee75d494ba2524762b188864148928d2da55f))
* add node-fetch for Octokit ([f73fa4b](https://github.com/johnlindquist/ghx/commit/f73fa4ba71c20104d2eb94b5a7e8c51082593e9d))
* add publishConfig for public access ([849332d](https://github.com/johnlindquist/ghx/commit/849332de220e8578df0625904bd2b38e8d310e26))
* add semantic-release as dev dependency ([0f68d90](https://github.com/johnlindquist/ghx/commit/0f68d905d62819b88027d50bfd62c7a6fbfe44b7))
* add shebang and fix package.json ([13a6725](https://github.com/johnlindquist/ghx/commit/13a6725f1a3514be645bc476fa625508fdd79be0))
* **bin:** creating the bin/readme.md/etc ([21766b9](https://github.com/johnlindquist/ghx/commit/21766b91f903823ae05e8c2dbd0cb115daad5a36))
* entry point check ([d44ea17](https://github.com/johnlindquist/ghx/commit/d44ea17528bc50b0d6fc9c9162a666593b724518))
* handle line ranges properly to avoid undefined content ([a724351](https://github.com/johnlindquist/ghx/commit/a7243518802bc78019b45218bd16cf819dcfd118))
* **init:** adding initial working demo ([4716ba7](https://github.com/johnlindquist/ghx/commit/4716ba79df359205e23566d36b6c1f4f9842c18a))
* **init:** adding initial working demo ([c7e8205](https://github.com/johnlindquist/ghx/commit/c7e8205deae228db0a73c3e6263749201b86cd1e))
* **init:** adding initial working demo ([93a81d1](https://github.com/johnlindquist/ghx/commit/93a81d1c025c2f32164215d8e4e3d5ef057c02f5))
* run ghsearch directly when loaded as CLI ([f174f7a](https://github.com/johnlindquist/ghx/commit/f174f7a7bfda65792a156121d0b062e359f892d8))
* typescript errors ([e17752d](https://github.com/johnlindquist/ghx/commit/e17752dbd5822613a6f63a269729a5aaec012ab7))
* use template literals for content strings ([d86b02a](https://github.com/johnlindquist/ghx/commit/d86b02aefd93da521c457cffe257a1bed71b3308))


### Features

* add semantic versioning with commitizen and semantic-release ([1db659a](https://github.com/johnlindquist/ghx/commit/1db659abca4e45252ba39d54fa9f9ffe176e82b1))
* store config and search results in platform-specific paths ([1e833ea](https://github.com/johnlindquist/ghx/commit/1e833ea7a28acfb12e67ba2309e289893b003949))
