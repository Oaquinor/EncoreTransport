const preview =
  document.querySelector(
    '#seatPreview',
  );

if (preview) {
  const decorate = () => {
    preview
      .querySelectorAll(
        'button.seat',
      )
      .forEach(
        (seat) => {
          if (
            seat.querySelector(
              '.website-seat-physical',
            )
          ) {
            return;
          }

          const label =
            seat.textContent?.trim() ?? '';

          seat.textContent = '';

          const physical =
            document.createElement(
              'span',
            );

          physical.className =
            'website-seat-physical';

          const text =
            document.createElement(
              'b',
            );

          text.textContent = label;

          seat.append(
            physical,
            text,
          );
        },
      );
  };

  const observer =
    new MutationObserver(
      decorate,
    );

  observer.observe(
    preview,
    {
      childList: true,
      subtree: true,
    },
  );

  decorate();
}
