# Start with the stable official image
FROM jitsi/web:stable-10710

# 1. Clean default UI to avoid stale files
RUN rm -rf /usr/share/jitsi-meet/*

# 2. Copy Asset Directories
#    'libs' contains app.bundle.min.js and all the WASM files you listed
COPY libs/ /usr/share/jitsi-meet/libs/
COPY css/ /usr/share/jitsi-meet/css/
COPY images/ /usr/share/jitsi-meet/images/
COPY sounds/ /usr/share/jitsi-meet/sounds/
COPY fonts/ /usr/share/jitsi-meet/fonts/
COPY lang/ /usr/share/jitsi-meet/lang/
COPY static/ /usr/share/jitsi-meet/static/

# 3. Copy Specific Root Files
COPY *.html /usr/share/jitsi-meet/
COPY manifest.json /usr/share/jitsi-meet/
COPY pwa-worker.js /usr/share/jitsi-meet/
COPY *.ico /usr/share/jitsi-meet/

# 4. Clean up Configs
#    We delete these specific files so the container can symlink them 
#    from your /config volume at startup.
RUN rm -f /usr/share/jitsi-meet/config.js /usr/share/jitsi-meet/interface_config.js

# Ensure permissions are correct (nginx needs to read them)
RUN chown -R root:root /usr/share/jitsi-meet/
