# sberzvuk-downloader

## Installation

```bash
$ git clone https://github.com/devdmytro/sberzvuk-downloader.git
$ cd ./sberzvuk-downloader
$ yarn install && yarn build
```

## Running the app

```bash
# cli gui mode
$ yarn start

# Also this app has parameters interface, but it's broken right now :(
$ yarn start -h
# yarn run v1.22.18
# $ node bin -h
#
# A downloader utility for SberZvuk.
#
#  Downloads a music track/artist/album from a provided URL.
#
# Options
#
#  -h, --help             Print this usage guide
#  -t, --token string     Token for SberZvuk (x-auth-token header) (required)
#  -q, --quality string   Audio quality (mid, high, flac) (required)
#  -p, --path string      Download folder path (default: ./$appDir/Downloads)
#  --threads number       Number of simultaneous downloads (default: 1)
#  --cover-size string    Cover size (default: 1024x1024)
#
# Done in 0.38s.
$
```
