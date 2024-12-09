// Chọn các phần tử DOM
const runButton = document.getElementById('runButton');
const optionSelect = document.getElementById('optionSelect');
const numPhilosophersInput = document.getElementById('numPhilosophers');
const contentBox = document.getElementById('contentBox');

// Khai báo các biến toàn cục
let philosophers = [];
let numPhilosophers = 5; // Giá trị mặc định
let maxEats = 1; // Giới hạn số lần ăn tối đa cho mỗi triết gia
let maxItems = 10; // Giới hạn số sản phẩm tối đa cho Producer-Consumer
// Biến lưu trữ các sản phẩm trong kho
let buffer = [];
let bufferMaxSize = 10; 
let producerConsumerRunning = true;
// Hàm để hiển thị kết quả
function displayResult(message, isReader = false, isWriter = false) {
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = message;

    if (isReader) {
        messageDiv.classList.add('reader-animation');
    } else if (isWriter) {
        messageDiv.classList.add('writer-animation');
    }

    contentBox.appendChild(messageDiv);
    contentBox.scrollTop = contentBox.scrollHeight;  
}

// Hàm tạm dừng (sleep)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Khai báo Semaphore
class Semaphore {
    constructor(count) {
        this.count = count;
        this.queue = [];
    }

    async wait() {
        if (this.count <= 0) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.count--;
    }

    signal() {
        this.count++;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
        }
    }
}

// Khai báo Monitor
class Monitor {
    constructor() {
        this.lock = false;
        this.queue = [];
    }

    async enter() {
        while (this.lock) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.lock = true;
    }

    leave() {
        this.lock = false;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
        }
    }
}


// Triết gia 73 -> 275
const diningTable = document.getElementById('diningTable'); // Khu vực hiển thị bàn ăn
// Tạo giao diện bàn ăn với triết gia và đũa
function createPhilosophersUI(numPhilosophers) {
    diningTable.innerHTML = ""; 
    philosophers = [];
    const angleStep = 360 / numPhilosophers;

    for (let i = 0; i < numPhilosophers; i++) {
        const philosopher = document.createElement('div');
        philosopher.className = 'philosopher thinking';
        philosopher.textContent = `P${i + 1}`;
        philosopher.style.transform = `rotate(${angleStep * i}deg) translate(120px) rotate(-${angleStep * i}deg)`;
        diningTable.appendChild(philosopher);
        const chopsticksIndicator = document.createElement('div');
        chopsticksIndicator.className = 'chopsticks-indicator';
        chopsticksIndicator.textContent = '🍴'; // Hiển thị 1 đũa mặc định
        philosopher.appendChild(chopsticksIndicator);
        philosophers.push({ element: philosopher, indicator: chopsticksIndicator });
    }
}
// Cập nhật trạng thái triết gia
function updatePhilosopherState(id, state) {
    const philosopher = philosophers[id].element;
    philosopher.className = `philosopher ${state}`;
}
// Cập nhật trạng thái đũa
function updateChopstickCount(id, count) {
    const indicator = philosophers[id].indicator;
    if (count === 2) {
        indicator.textContent = '🍴🍴'; 
    } else if (count === 1) {
        indicator.textContent = '🍴'; 
    } else {
        indicator.textContent = '💤'; 
    }
}
// Hàm cho Semaphore (Triết gia)
async function semaphorePhilosophers() {
    const semaphore = new Semaphore(numPhilosophers - 1); // Giới hạn số triết gia ăn đồng thời
    const chopsticks = new Array(numPhilosophers).fill(false); // Trạng thái của từng đũa (false = chưa được dùng)

    async function philosopher(id) {
        let eats = 0;

        while (eats < maxEats) {
            // Triết gia đang suy nghĩ
            updatePhilosopherState(id, 'thinking');
            updateChopstickCount(id, 0); // Không có đũa khi suy nghĩ
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(7000); // Thời gian suy nghĩ

            // Chờ quyền ăn (tối đa n-1 triết gia ăn cùng lúc)
            await semaphore.wait();

            let left = id;
            let right = (id + 1) % numPhilosophers;

            // Đổi thứ tự lấy đũa cho triết gia cuối cùng
            if (id === numPhilosophers - 1) {
                [left, right] = [right, left];
            }

            // Cầm đũa bên trái trước
            if (!chopsticks[left]) {
                chopsticks[left] = true;
                updateChopstickCount(id, 1); // Đang cầm 1 đũa
                displayResult(`Triết gia ${id + 1}: đã cầm đũa bên trái.`);
                updatePhilosopherState(id, 'waiting'); // Đang chờ đũa bên phải
                await sleep(1000); // Thời gian cầm đũa
            }

            // Kiểm tra cầm đũa bên phải nếu cầm được đũa bên trái
            if (chopsticks[left] && !chopsticks[right]) {
                chopsticks[right] = true;
                updateChopstickCount(id, 2); // Đang cầm 2 đũa
                displayResult(`Triết gia ${id + 1}: đã cầm đũa bên phải.`);
                updatePhilosopherState(id, 'eating'); // Chuyển sang trạng thái ăn
                displayResult(`Triết gia ${id + 1}: đang ăn...`);
                await sleep(5000); // Thời gian ăn

                // Trả lại cả hai đũa sau khi ăn
                chopsticks[left] = chopsticks[right] = false;
                updateChopstickCount(id, 0); // Không cầm đũa nữa
                eats++;
                displayResult(`Triết gia ${id + 1}: đã ăn xong.`);
            } else {
                // Nếu không cầm đủ hai đũa, trả lại đũa bên trái
                chopsticks[left] = false;
                updateChopstickCount(id, 0); // Không cầm đũa nữa
                displayResult(`Triết gia ${id + 1}: đã bỏ đũa bên trái vì không cầm được đũa phải.`);
            }

            // Trả quyền ăn cho triết gia khác
            semaphore.signal();
        }

        // Triết gia hoàn thành
        updatePhilosopherState(id, 'done');
        updateChopstickCount(id, 0);
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    // Khởi tạo giao diện cho số triết gia
    createPhilosophersUI(numPhilosophers);
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id));
    await Promise.all(tasks); // Đợi tất cả triết gia hoàn thành
}

// Hàm cho Monitor (Triết gia)
async function monitorPhilosophers() {
    const chopsticks = new Array(numPhilosophers).fill(false); // Trạng thái đũa (false = chưa được dùng)
    const monitor = new Monitor(); // Tạo monitor để quản lý đồng bộ

    async function philosopher(id) {
        let eats = 0;

        while (eats < maxEats) {
            // Triết gia đang suy nghĩ
            updatePhilosopherState(id, 'thinking');
            updateChopstickCount(id, 0);
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(3000); // Thời gian suy nghĩ

            await monitor.enter(); // Triết gia vào monitor để kiểm tra đũa

            // Xác định đũa trái và phải
            const left = id;
            const right = (id + 1) % numPhilosophers;

            // Kiểm tra nếu cả hai đũa chưa được cầm
            if (!chopsticks[left] && !chopsticks[right]) {
                // Cầm đũa trái trước
                chopsticks[left] = true;
                updateChopstickCount(id, 1); // Cầm 1 đũa (trái)
                displayResult(`Triết gia ${id + 1}: đã cầm đũa bên trái.`);

                // Cầm đũa phải nếu có thể
                if (!chopsticks[right]) {
                    chopsticks[right] = true; // Cầm đũa phải
                    updateChopstickCount(id, 2); // Cầm 2 đũa
                    updatePhilosopherState(id, 'eating'); // Đang ăn
                    displayResult(`Triết gia ${id + 1}: đã cầm đũa bên phải, đang ăn...`);
                    await sleep(3000); // Thời gian ăn

                    // Trả lại đũa sau khi ăn
                    chopsticks[left] = chopsticks[right] = false;
                    updateChopstickCount(id, 0); // Không cầm đũa nữa
                    eats++; // Tăng số lần ăn
                    displayResult(`Triết gia ${id + 1}: đã ăn xong.`);
                } else {
                    // Nếu không cầm được đũa phải, bỏ đũa trái
                    chopsticks[left] = false;
                    updateChopstickCount(id, 0); // Không cầm đũa nữa
                    displayResult(`Triết gia ${id + 1}: không cầm được đũa bên phải, bỏ đũa bên trái.`);
                }
            }

            monitor.leave(); // Rời khỏi monitor để nhường cho triết gia khác
        }

        // Triết gia hoàn thành
        updatePhilosopherState(id, 'done');
        updateChopstickCount(id, 0);
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    // Tạo giao diện bàn ăn
    createPhilosophersUI(numPhilosophers);

    // Khởi chạy các triết gia đồng thời
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id));
    await Promise.all(tasks); // Đợi tất cả triết gia hoàn thành
}


// Hàm để tạo Deadlock với Semaphore (Triết gia)
async function semaphorePhilosophersDeadlock() {
    const semaphore = new Semaphore(numPhilosophers - 1);  // Chỉ cho phép numPhilosophers - 1 triết gia vào cùng một lúc
    const chopsticks = new Array(numPhilosophers).fill(false);  // Mảng lưu trạng thái đũa

    async function philosopher(id) {
        let eats = 0;

        while (true) { 
            updatePhilosopherState(id, 'thinking');  // Triết gia đang suy nghĩ
            updateChopstickCount(id, 0); 
            displayResult(`Triết gia ${id + 1}: đang suy nghĩ...`);
            await sleep(5000);  // Thời gian suy nghĩ

            // Triết gia xin phép vào (semaphore)
            updateChopstickCount(id, 1); 
            await semaphore.wait();  // Chờ tới lượt vào

            let left = id;
            let right = (id + 1) % numPhilosophers;

            // Đảo thứ tự lấy đũa cho một số triết gia (để tạo deadlock)
            if (id % 2 === 0) { 
                [left, right] = [right, left];
            }

            // Triết gia lấy đũa bên trái nếu chưa có ai giữ
            if (!chopsticks[left]) {
                chopsticks[left] = true;
                updateChopstickCount(id, 1); 
                displayResult(`Triết gia ${id + 1}: đang giữ một chiếc đũa bên trái.`);
            }

            // Nếu không thể lấy đũa bên phải, tạo ra deadlock liên tục
            if (!chopsticks[right]) {
                // Trường hợp deadlock khi không thể lấy đũa bên phải
                displayResult(`Triết gia ${id + 1}: không thể ăn (deadlock) vì thiếu đũa bên phải.`);
                
                // Tiếp tục giữ đũa bên trái và quay lại thử lại sau
                await sleep(500);  // Thời gian chờ trước khi thử lại
                continue;  // Tiếp tục vòng lặp mà không ăn
            }

            // Nếu có đủ đũa, triết gia ăn
            chopsticks[left] = chopsticks[right] = true;
            updateChopstickCount(id, 2);  // Cập nhật số đũa đang giữ
            updatePhilosopherState(id, 'eating');  // Triết gia đang ăn
            displayResult(`Triết gia ${id + 1}: đang ăn...`);
            await sleep(5000);  // Thời gian ăn

            // Trả lại đũa sau khi ăn
            chopsticks[left] = chopsticks[right] = false;
            updateChopstickCount(id, 1); 
            eats++;
            displayResult(`Triết gia ${id + 1}: đã ăn xong.`);

            // Kết thúc lượt ăn, giải phóng semaphore
            semaphore.signal(); 
        }

        updatePhilosopherState(id, 'done'); 
        updateChopstickCount(id, 0); 
        displayResult(`Triết gia ${id + 1}: hoàn thành.`);
    }

    createPhilosophersUI(numPhilosophers);
    const tasks = Array.from({ length: numPhilosophers }, (_, id) => philosopher(id));
    await Promise.all(tasks);
}

// Producer-Consumer 278 -> 360
// Producer-Consumer với Semaphore
async function semaphoreProducerConsumer() {
    const empty = new Semaphore(bufferMaxSize); // Semaphore đếm số ô trống
    const full = new Semaphore(0); // Semaphore đếm số ô có sản phẩm
    const mutex = new Semaphore(1); // Semaphore khóa truy cập vào buffer
    let producedCount = 0; // Đếm số sản phẩm đã sản xuất
    let consumedCount = 0; // Đếm số sản phẩm đã tiêu thụ

    async function producer() {
        while (producerConsumerRunning && producedCount < maxItems) {
            await empty.wait(); // Đợi có ô trống
            await mutex.wait(); // Đợi truy cập buffer

            const item = Math.floor(Math.random() * 100);
            buffer.push(item);
            producedCount++;
            displayResult(`Producer: sản xuất ${item} (Tổng số sản xuất: ${producedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);

            mutex.signal(); // Mở khóa truy cập buffer
            full.signal(); // Tăng số lượng sản phẩm
            await sleep(1500); // Thay đổi thời gian để làm nổi bật
        }
        displayResult("Producer: Đã đạt giới hạn sản phẩm.");
    }

    async function consumer() {
        while (producerConsumerRunning && consumedCount < maxItems) {
            await full.wait(); // Đợi có sản phẩm
            await mutex.wait(); // Đợi truy cập buffer

            const item = buffer.shift();
            consumedCount++;
            displayResult(`Consumer: tiêu thụ ${item} (Tổng số tiêu thụ: ${consumedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);

            mutex.signal(); // Mở khóa truy cập buffer
            empty.signal(); // Tăng số lượng ô trống
            await sleep(1000);
        }
        displayResult("Consumer: Đã đạt giới hạn sản phẩm tiêu thụ.");
    }

    producer();
    consumer();
}
// Producer-Consumer với Monitor
async function monitorProducerConsumer() {
    const monitor = new Monitor();
    let producedCount = 0; // Đếm số sản phẩm đã sản xuất
    let consumedCount = 0; // Đếm số sản phẩm đã tiêu thụ

    async function producer() {
        while (producerConsumerRunning && producedCount < maxItems) {
            await monitor.enter();
            if (buffer.length < bufferMaxSize) {
                const item = Math.floor(Math.random() * 100);
                buffer.push(item);
                producedCount++;
                displayResult(`Producer: sản xuất ${item} (Tổng số sản xuất: ${producedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);
            }
            monitor.leave();
            await sleep(1000); // Thời gian chờ cho Monitor
        }
        displayResult("Producer: Đã đạt giới hạn sản phẩm.");
    }

    async function consumer() {
        while (producerConsumerRunning && consumedCount < maxItems) {
            await monitor.enter();
            if (buffer.length > 0) {
                const item = buffer.shift();
                consumedCount++;
                displayResult(`Consumer: tiêu thụ ${item} (Tổng số tiêu thụ: ${consumedCount}, Buffer: ${buffer.length}/${bufferMaxSize})`);
            }
            monitor.leave();
            await sleep(1200); // Thay đổi thời gian chờ cho Monitor
        }
        displayResult("Consumer: Đã đạt giới hạn sản phẩm tiêu thụ.");
    }

    producer();
    consumer();
}
// Hàm để tạo Deadlock với Semaphore (Producer-Consumer)
async function semaphoreProducerConsumerDeadlock() {
    const empty = new Semaphore(bufferMaxSize); // Semaphore đếm số ô trống
    const full = new Semaphore(0); // Semaphore đếm số ô có sản phẩm
    const mutex = new Semaphore(1); // Semaphore khóa truy cập vào buffer
    let producedCount = 0; // Đếm số sản phẩm đã sản xuất
    let consumedCount = 0; // Đếm số sản phẩm đã tiêu thụ

    // Producer
    async function producer() {
        while (producedCount < maxItems) {
            await empty.wait(); // Chờ có ô trống
            await mutex.wait(); // Chờ truy cập vào buffer

            const item = Math.floor(Math.random() * 100); // Tạo sản phẩm
            buffer.push(item); // Thêm vào buffer
            producedCount++;
            displayResult(`Producer: sản xuất sản phẩm ${item} (Tổng số: ${producedCount})`);

            // **Deadlock tạo ra do giữ mutex mà không giải phóng**
            if (buffer.length === bufferMaxSize) {
                displayResult("Producer: Deadlock! Buffer đã đầy, giữ khóa mutex.");
                return; // Kết thúc vòng lặp
            }

            mutex.signal(); // Giải phóng buffer
            full.signal(); // Tăng số lượng sản phẩm trong buffer
            await sleep(1000); // Thời gian chờ
        }
    }

    // Consumer
    async function consumer() {
        while (consumedCount < maxItems) {
            await full.wait(); // Chờ có sản phẩm
            await mutex.wait(); // Chờ truy cập vào buffer

            const item = buffer.shift(); // Lấy sản phẩm từ buffer
            consumedCount++;
            displayResult(`Consumer: tiêu thụ sản phẩm ${item} (Tổng số: ${consumedCount})`);

            // **Deadlock tạo ra do giữ mutex mà không giải phóng**
            if (buffer.length === 0) {
                displayResult("Consumer: Deadlock! Buffer rỗng, giữ khóa mutex.");
                return; // Kết thúc vòng lặp
            }

            mutex.signal(); // Giải phóng buffer
            empty.signal(); // Tăng số lượng ô trống
            await sleep(1000); // Thời gian chờ
        }
    }

    // Khởi chạy Producer và Consumer đồng thời
    await Promise.all([producer(), consumer()]);
}





const deadlockProducerConsumerButton = document.getElementById('deadlockProducerConsumerButton');
if (deadlockProducerConsumerButton) {
    deadlockProducerConsumerButton.addEventListener('click', async () => {
        contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
        await semaphoreProducerConsumerDeadlock(); // Chạy deadlock cho Producer-Consumer
    });
}

// Sự kiện khi nhấn nút deadlock
const deadlockButton = document.getElementById('deadlockButton');
if (deadlockButton) {
    deadlockButton.addEventListener('click', async () => {
        contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
        numPhilosophers = parseInt(numPhilosophersInput.value); // Lấy số triết gia
        await semaphorePhilosophersDeadlock();
    });
}

async function semaphoreReaderWriter() {
    const mutex = new Semaphore(1); // Bảo vệ biến `readerCount`
    const db = new Semaphore(1);    // Quản lý truy cập vào cơ sở dữ liệu
    let readerCount = 0;
    let activeWriters = 0;
    let waitingWriters = 0;
    let activeReaders = 0;

    // Cập nhật trạng thái hiển thị
    function updateStatus() {
        displayResult(
            `Đang ghi: ${activeWriters}, Đợi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: ${readerCount - activeReaders}`,
            false,
            false
        );
    }

    // Hàm mô phỏng hành vi của một Reader
    async function reader(id) {
        for (let i = 0; i < 5; i++) {
            // Bắt đầu đọc
            await mutex.wait();
            readerCount++;
            if (readerCount === 1) {
                await db.wait(); // Chặn Writer
            }
            activeReaders++;
            updateStatus();
            mutex.signal();

            // Thực hiện đọc
            displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
            await sleep(1000);

            // Kết thúc đọc
            await mutex.wait();
            activeReaders--;
            readerCount--;
            if (readerCount === 0) {
                db.signal(); // Cho phép Writer ghi
            }
            updateStatus();
            mutex.signal();

            displayResult(`Reader ${id} đã ngừng đọc.`, true, false);
            await sleep(1000);
        }
    }

    // Hàm mô phỏng hành vi của một Writer
    async function writer(id) {
        for (let i = 0; i < 3; i++) {
            // Chuẩn bị ghi
            waitingWriters++;
            updateStatus();
            await db.wait(); // Chờ cho phép ghi
            waitingWriters--;
            activeWriters++;
            updateStatus();

            // Thực hiện ghi
            displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
            await sleep(1000);

            // Kết thúc ghi
            activeWriters--;
            updateStatus();
            db.signal();

            displayResult(`Writer ${id} đã ngừng ghi.`, false, true);
            await sleep(1000);
        }
    }

    // Tạo các Readers và Writers
    const readerPromises = Array.from({ length: 3 }, (_, i) => reader(i));
    const writerPromises = Array.from({ length: 2 }, (_, i) => writer(i));

    // Chờ tất cả Readers và Writers hoàn thành
    await Promise.all([...readerPromises, ...writerPromises]);
}

async function monitorReaderWriter() {
    const monitor = new Monitor();
    let activeReaders = 0;
    let activeWriters = 0;
    let waitingWriters = 0;

    function updateStatus() {
        displayResult(
            `Đang ghi: ${activeWriters}, Đợi ghi: ${waitingWriters}, Đang đọc: ${activeReaders}, Đợi đọc: 0`,
            false,
            false
        );
    }

    async function endRead(id) {
        await monitor.enter();
        activeReaders--;
        displayResult(`Reader ${id} đã ngừng đọc.`, true, false);

        if (activeReaders === 0 && waitingWriters > 0) {
            monitor.leave(); // Cho phép writer tiếp theo
        } else {
            monitor.leave();
        }
        updateStatus();
    }

    async function endWrite(id) {
        await monitor.enter();
        activeWriters--;
        displayResult(`Writer ${id} đã ngừng ghi.`, false, true);

        if (waitingWriters > 0) {
            monitor.leave(); // Cho phép writer tiếp theo
        } else {
            monitor.leave();
        }
        updateStatus();
    }

    async function startRead(id) {
        await monitor.enter();

        while (activeWriters > 0 || waitingWriters > 0) {
            monitor.leave();
            await new Promise(resolve => setTimeout(resolve, 10));
            await monitor.enter();
        }

        activeReaders++;
        displayResult(`Reader ${id} đang đọc dữ liệu...`, true, false);
        updateStatus();
        monitor.leave();
    }

    async function startWrite(id) {
        await monitor.enter();
        waitingWriters++;

        while (activeWriters > 0 || activeReaders > 0) {
            monitor.leave();
            await new Promise(resolve => setTimeout(resolve, 10));
            await monitor.enter();
        }

        waitingWriters--;
        activeWriters++;
        displayResult(`Writer ${id} đang ghi dữ liệu...`, false, true);
        updateStatus();
        monitor.leave();
    }

    async function reader(id) {
        for (let i = 0; i < 5; i++) {
            await startRead(id);
            await sleep(1000); // Đọc dữ liệu
            await endRead(id);
            await sleep(1000); // Nghỉ ngơi
        }
    }

    async function writer(id) {
        for (let i = 0; i < 3; i++) {
            await sleep(1000); // Tạo dữ liệu
            await startWrite(id);
            await sleep(1000); // Ghi dữ liệu
            await endWrite(id);
            await sleep(1000); // Nghỉ ngơi
        }
    }

    const readerPromises = Array.from({ length: 3 }, (_, i) => reader(i));
    const writerPromises = Array.from({ length: 2 }, (_, i) => writer(i));

    await Promise.all([...readerPromises, ...writerPromises]);
}



async function semaphoreDeadlockReaderWriter() {
    const mutex = new Semaphore(1); // Bảo vệ biến readerCount
    const db = new Semaphore(1);    // Quản lý truy cập vào cơ sở dữ liệu
    let readerCount = 0;
    let activeWriters = 0;
    let activeReaders = 0;

    // Cập nhật trạng thái hiển thị
    function updateStatus() {
        displayResult(
            `Đang ghi: ${activeWriters}, Đang đọc: ${activeReaders}, Chờ readerCount: ${readerCount}`,
            false,
            false
        );
    }

    // Hàm Reader cố ý gây deadlock
    async function deadlockReader(id) {
        await mutex.wait(); // Reader khóa mutex
        readerCount++;      // Tăng số lượng readers
        if (readerCount === 1) {
            await db.wait(); // Chặn writers
        }
        activeReaders++;
        updateStatus();
        // Không bao giờ giải phóng mutex để gây deadlock
    }

    // Hàm Writer cố ý bị kẹt do Reader không giải phóng
    async function deadlockWriter(id) {
        await db.wait(); // Writer cố gắng truy cập nhưng bị kẹt
        activeWriters++;
        updateStatus();

        // Không bao giờ giải phóng db để minh họa trạng thái kẹt
    }

    // Tạo 1 Reader và 1 Writer
    const readerPromise = deadlockReader(1);
    const writerPromise = deadlockWriter(1);

    // Chờ chúng chạy mãi mãi (hoặc gây deadlock)
    await Promise.race([readerPromise, writerPromise]);
}

// Gọi hàm tạo deadlock
const deadlockReaderWriterButton = document.getElementById('deadlockReaderWriterButton');
if (deadlockReaderWriterButton) {
    deadlockReaderWriterButton.addEventListener('click', async () => {
        contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
        await semaphoreDeadlockReaderWriter(); // Chạy deadlock cho Producer-Consumer
    });
}






// Sự kiện khi nhấn nút chạy
runButton.addEventListener('click', async () => {
    contentBox.innerHTML = ""; // Xóa nội dung trước khi chạy
    numPhilosophers = parseInt(numPhilosophersInput.value); // Lấy số triết gia
    producerConsumerRunning = true;
    const selectedOption = optionSelect.value;

    switch (selectedOption) {
        case 'Philosophers - Semaphore':
            await semaphorePhilosophers();
            break;
        case 'Philosophers - Monitor':
            await monitorPhilosophers();
            break;
        case 'Producer-Consumer - Semaphore':
            await semaphoreProducerConsumer();
            break;
        case 'Producer-Consumer - Monitor':
            await monitorProducerConsumer();
            break;
        case 'Reader-Writer - Semaphore':
            await semaphoreReaderWriter();
            break;
        case 'Reader-Writer - Monitor':
            await monitorReaderWriter();
            break;
        default:
            displayResult('Chưa chọn phương pháp nào.');
            break;
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Nút "Mô tả" Triết gia
    const descriptionButtonTG = document.querySelector('a[href="/mota-trietgia.html"]');
    // Phần tử hình ảnh của Triết gia
    const diningTableDivTG = document.getElementById("diningTable").parentElement;
    // Phần tử chứa mô tả của Triết gia
    const descriptionContentTG = document.getElementById("descriptionContent");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị hình ảnh"
    let isDescriptionVisibleTG = false;
  
    if (descriptionButtonTG && diningTableDivTG && descriptionContentTG) {
      // Sự kiện khi nhấn nút mô tả
      descriptionButtonTG.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisibleTG) {
          // Quay lại hiển thị hình ảnh
          diningTableDivTG.style.display = "block"; // Hiển thị hình ảnh
          descriptionContentTG.style.display = "none"; // Ẩn mô tả
          descriptionButtonTG.textContent = "Mô tả bài toán Bữa ăn của các Triết gia"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          diningTableDivTG.style.display = "none"; // Ẩn hình ảnh
          descriptionContentTG.style.display = "block"; // Hiển thị mô tả
          descriptionButtonTG.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisibleTG = !isDescriptionVisibleTG;
      });
    }
  });
  

  

  document.addEventListener("DOMContentLoaded", function () {
    // Lấy các phần tử cần thiết
    const descriptionButtonRW = document.querySelector('a[href="/mota-writers-reader.html"]');
    const imageRW = document.querySelector('.img-fluid'); // Ảnh của Writer-Reader
    const descriptionContentRW = document.getElementById("descriptionContent-rw");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị ảnh"
    let isDescriptionVisibleRW = false;
  
    // Đảm bảo các phần tử tồn tại trước khi thao tác
    if (descriptionButtonRW && imageRW && descriptionContentRW) {
      // Gắn sự kiện click vào nút mô tả
      descriptionButtonRW.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisibleRW) {
          // Quay lại hiển thị ảnh
          imageRW.style.display = "block"; // Hiện ảnh
          descriptionContentRW.style.display = "none"; // Ẩn mô tả
          descriptionButtonRW.textContent = "Mô tả bài toán Writer-Reader"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          imageRW.style.display = "none"; // Ẩn ảnh
          descriptionContentRW.style.display = "block"; // Hiện mô tả
          descriptionButtonRW.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisibleRW = !isDescriptionVisibleRW;
      });
    }
  });
  
  
  document.addEventListener("DOMContentLoaded", function () {
    // Lấy các phần tử cần thiết
    const descriptionButtonRW = document.querySelector('a[href="/mota-producer-consumer.html"]');
    const imageRW = document.querySelector('.img-fluid'); // Ảnh
    const descriptionContentRW = document.getElementById("descriptionContent-pc");
  
    // Khởi tạo trạng thái: bắt đầu ở chế độ "Hiển thị ảnh"
    let isDescriptionVisible = false;
  
    // Đảm bảo các phần tử tồn tại trước khi thao tác
    if (descriptionButtonRW && imageRW && descriptionContentRW) {
      // Gắn sự kiện click vào nút mô tả
      descriptionButtonRW.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn hành động mặc định
  
        if (isDescriptionVisible) {
          // Quay lại hiển thị ảnh
          imageRW.style.display = "block"; // Hiện ảnh
          descriptionContentRW.style.display = "none"; // Ẩn mô tả
          descriptionButtonRW.textContent = "Mô tả bài toán Producer-Consumer"; // Đổi lại tên nút
        } else {
          // Hiển thị mô tả
          imageRW.style.display = "none"; // Ẩn ảnh
          descriptionContentRW.style.display = "block"; // Hiện mô tả
          descriptionButtonRW.textContent = "Quay lại"; // Đổi tên nút
        }
  
        // Chuyển trạng thái
        isDescriptionVisible = !isDescriptionVisible;
      });
    }
  });
  