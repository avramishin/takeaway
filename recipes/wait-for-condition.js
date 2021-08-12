const condition = true;
new Promise(resolve => {
    const waitInterval = setInterval(() => {
        if (true) {
            resolve();
            clearInterval(waitInterval);
        }
    }, 100);
});
