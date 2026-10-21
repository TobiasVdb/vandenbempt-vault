import { installSecurityObserver } from './security-http.mjs'
// Public digest only. The read key is held by the Directorate collector.
installSecurityObserver({
  "sourceId": "app-cc8efc00-4a67-43e9-bd39-a95c252b3e8d",
  "keyHash": "0ca55a46954bdf16e3a29fa91bad012b45dae5e5eb2523fe50de4abaf959edb4",
  "bindings": [
    {
      "prefix": "/bob/",
      "target": "BOB",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    },
    {
      "prefix": "/ring-eater/",
      "target": "Ring Eater",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    },
    {
      "prefix": "/directorate/",
      "target": "Directorate",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    },
    {
      "prefix": "/nyc/",
      "target": "NYC Trip",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    },
    {
      "prefix": "/genk-standby/",
      "target": "Genk Standby",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    },
    {
      "prefix": "/",
      "target": "House of Tobias",
      "hosts": [
        "houseoftobias-lyb5w.ondigitalocean.app",
        "houseoftobias.be",
        "www.houseoftobias.be"
      ]
    }
  ],
  "fallbackTarget": "House of Tobias",
  "digitalOcean": true
})
