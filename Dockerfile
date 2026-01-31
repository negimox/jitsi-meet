# Start with the stable official image
FROM jitsi/web:stable-10710

# Clean default UI
RUN rm -rf /usr/share/jitsi-meet/*

# COPY assets (Note: Removed 'jitsi-meet/' prefix)
COPY libs/ /usr/share/jitsi-meet/libs/
COPY css/ /usr/share/jitsi-meet/css/
COPY images/ /usr/share/jitsi-meet/images/
COPY sounds/ /usr/share/jitsi-meet/sounds/
COPY fonts/ /usr/share/jitsi-meet/fonts/
COPY lang/ /usr/share/jitsi-meet/lang/
COPY *.html /usr/share/jitsi-meet/
COPY *.json /usr/share/jitsi-meet/

# Remove config files to allow regeneration at runtime
RUN rm -f /usr/share/jitsi-meet/config.js /usr/share/jitsi-meet/interface_config.js

# Ensure permissions are correct (nginx needs to read them)
RUN chown -R root:root /usr/share/jitsi-meet/
