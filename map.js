document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);

  // Extract query parameters
  const originLat = parseFloat(urlParams.get('originLat'));
  const originLon = parseFloat(urlParams.get('originLon'));
  const destLat = parseFloat(urlParams.get('destLat'));
  const destLon = parseFloat(urlParams.get('destLon'));

  if (isNaN(originLat) || isNaN(originLon) || isNaN(destLat) || isNaN(destLon)) {
    alert("Invalid location data. Please go back and enter valid locations.");
    return;
  }

  const origin = [originLat, originLon];
  const destination = [destLat, destLon];

  const busStops = [
    [originLat + 0.005, originLon + 0.005], // Closest stop
    [originLat + 0.01, originLon - 0.01],  // Second closest stop
  ];

  const secondClosestStop = busStops[1];

  const map = L.map('map').setView(origin, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Add markers
  L.marker(origin).addTo(map).bindPopup("Your Location").openPopup();
  L.marker(destination).addTo(map).bindPopup("Destination").openPopup();
  L.marker(secondClosestStop).addTo(map).bindPopup("Second Closest Bus Stop");

  // Add route from second closest bus stop to origin (red route)
  L.Routing.control({
    waypoints: [
      L.latLng(secondClosestStop),
      L.latLng(origin),
    ],
    routeWhileDragging: true,
    lineOptions: {
      styles: [{ color: 'red', weight: 4, opacity: 0.7 }] // Red route
    }
  }).addTo(map);

  // Add route from origin to destination (blue route)
  L.Routing.control({
    waypoints: [
      L.latLng(origin),
      L.latLng(destination),
    ],
    routeWhileDragging: false,
    lineOptions: {
      styles: [{ color: 'blue', weight: 4, opacity: 0.7 }] // Blue route
    }
  }).addTo(map);

  // Add bus marker
  const busIcon = L.icon({
    iconUrl: 'bus-icon.png', // Path to your custom bus icon
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const busMarker = L.marker(secondClosestStop, { icon: busIcon }).addTo(map);

  const etaDisplay = document.createElement('div');
  etaDisplay.style.position = 'absolute';
  etaDisplay.style.bottom = '10px';
  etaDisplay.style.left = '10px';
  etaDisplay.style.padding = '10px';
  etaDisplay.style.backgroundColor = 'white';
  etaDisplay.style.borderRadius = '5px';
  etaDisplay.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.3)';
  etaDisplay.innerHTML = 'Calculating ETA...';
  document.body.appendChild(etaDisplay);

  fetch(`https://router.project-osrm.org/route/v1/driving/${secondClosestStop[1]},${secondClosestStop[0]};${origin[1]},${origin[0]}?overview=full&geometries=geojson`)
    .then(response => response.json())
    .then(data => {
      if (!data.routes || data.routes.length === 0) {
        alert("No route found.");
        return;
      }

      const routeCoordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const totalDistance = data.routes[0].distance; // in meters
      const busSpeed = 10; // 10 meters per second
      const interval = 50; // 50ms per frame
      const distancePerFrame = (busSpeed * interval) / 1000; // Distance the bus moves per frame (meters)
      let remainingDistance = totalDistance;
      let eta = Math.round(totalDistance / busSpeed); // Initial ETA in seconds

      let index = 0;
      let currentPosition = L.latLng(routeCoordinates[index]);
      let nextPosition = L.latLng(routeCoordinates[index + 1]);

      etaDisplay.innerHTML = `ETA: ${Math.floor(eta / 60)} mins ${eta % 60} secs`;

      function animateBus() {
        if (index < routeCoordinates.length - 1) {
          const segmentDistance = currentPosition.distanceTo(nextPosition);

          if (segmentDistance <= distancePerFrame) {
            // Move to the next segment
            index++;
            currentPosition = nextPosition;
            nextPosition = L.latLng(routeCoordinates[index + 1]);
          } else {
            // Move bus along the current segment
            const progress = distancePerFrame / segmentDistance;
            const lat = currentPosition.lat + (nextPosition.lat - currentPosition.lat) * progress;
            const lng = currentPosition.lng + (nextPosition.lng - currentPosition.lng) * progress;
            currentPosition = L.latLng(lat, lng);
            busMarker.setLatLng(currentPosition);

            // Update remaining distance and ETA
            remainingDistance -= distancePerFrame;
            eta = Math.max(0, Math.round(remainingDistance / busSpeed));
            etaDisplay.innerHTML = `ETA: ${Math.floor(eta / 60)} mins ${eta % 60} secs`;
          }

          setTimeout(animateBus, interval);
        } else {
          etaDisplay.innerHTML = "Bus has arrived!";
          busMarker.bindPopup("Bus has arrived!").openPopup();
        }
      }

      animateBus();
    })
    .catch(error => {
      console.error("Error fetching route:", error);
    });
});
