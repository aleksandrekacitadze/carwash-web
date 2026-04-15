self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: "Notification",
      body: event.data.text ? event.data.text() : "",
    };
  }

  const title = payload.title || "Notification";
  const body = payload.body || "";
  const url = payload.url || payload?.data?.url || "/";
  const data = {
    ...payload.data,
    url,
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});