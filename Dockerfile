# Start with the stable official image
FROM jitsi/web:stable-10710

# Clean default UI to avoid stale files
RUN rm -rf /usr/share/jitsi-meet/*

# --- ASSET COPY SECTION ---
# 1. Copy Directories
COPY libs/ /usr/share/jitsi-meet/libs/
COPY css/ /usr/share/jitsi-meet/css/
COPY images/ /usr/share/jitsi-meet/images/
COPY sounds/ /usr/share/jitsi-meet/sounds/
COPY fonts/ /usr/share/jitsi-meet/fonts/
COPY lang/ /usr/share/jitsi-meet/lang/
# This folder is critical for avoiding 404s on connection logic
COPY connection_optimization/ /usr/share/jitsi-meet/connection_optimization/

# 2. Copy Root Files
COPY *.html /usr/share/jitsi-meet/
COPY *.json /usr/share/jitsi-meet/
COPY *.js /usr/share/jitsi-meet/
COPY *.txt /usr/share/jitsi-meet/
COPY *.ico /usr/share/jitsi-meet/

# --- CONFIG CLEANUP ---
# We delete these specific files so the container's startup script 
# can regenerate them (symlink them to /config) correctly.
RUN rm -f /usr/share/jitsi-meet/config.js /usr/share/jitsi-meet/interface_config.js
# Ensure permissions are correct (nginx needs to read them)
RUN chown -R root:root /usr/share/jitsi-meet/
