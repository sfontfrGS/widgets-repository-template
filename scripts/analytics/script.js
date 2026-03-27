(function () {
  "use strict";

  var EVENTS = {
    IMPRESSION: "widget_impression",
    CLICK: "widget_click",
  };

  function track(eventName, data) {
    console.log("[analytics]", eventName, data);
    if (window.CustomEvent) {
      document.dispatchEvent(
        new CustomEvent("widget:analytics", {
          detail: { event: eventName, data: data, timestamp: Date.now() },
        })
      );
    }
  }

  function observeImpressions() {
    if (!window.IntersectionObserver) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var widgetType =
              entry.target.getAttribute("data-widget-type") || "unknown";
            track(EVENTS.IMPRESSION, { widgetType: widgetType });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll("[data-widget-type]").forEach(function (el) {
      observer.observe(el);
    });
  }

  function observeClicks() {
    document.addEventListener("click", function (e) {
      var widget = e.target.closest("[data-widget-type]");
      if (widget) {
        track(EVENTS.CLICK, {
          widgetType: widget.getAttribute("data-widget-type"),
          target: e.target.tagName.toLowerCase(),
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      observeImpressions();
      observeClicks();
    });
  } else {
    observeImpressions();
    observeClicks();
  }
})();
