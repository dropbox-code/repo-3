# renovate-config

Onboarding config presets for `eg-renovate` are hosted in this repository.

| File Name | Description |
| default.json | The baseline preset for all EG |
| actions.json | Rules for GitHub Actions |
| docker.json | Rules for Docker |
| helm.json | Rules for Helm |
| versions.json | Setting update type rules |

## Utilizing configs

In the repository `renovate.json`, include the following section:

```json
"extends": [
    "local>ExpediaGroup/renovate-config"
]
```

## Overrides

All configuration is can be overwritten by adding the appropriate configuration to the repository specific `renovate.json`.

See [Renovate's documentation](https://docs.renovatebot.com/configuration-options/) for information on specific settings.
