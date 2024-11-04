import EventEmitter from 'eventemitter3';

interface ICanvasListener {
    type: string;
    fn: (ev: any) => void;
}

interface ICanvasDrawerEvent {
    move: [];
    end: [path: [number, number][]];
    start: [];
}

export enum DrawMode {
    Draw,
    Erase
}

export class CanvasDrawer extends EventEmitter<ICanvasDrawerEvent> {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    tempCanvas: HTMLCanvasElement;
    tempCtx: CanvasRenderingContext2D;

    posX: number = 0;
    posY: number = 0;

    private drawMode: DrawMode = DrawMode.Draw;

    private mouseDown = false;
    private touchDown = false;
    private touchId: number | undefined;
    private trace: [number, number][] = [];
    private lastNode: [number, number] | undefined;

    private brushSize: number = 5;

    private li: ICanvasListener[] = [];

    constructor(
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        tempCanvas: HTMLCanvasElement,
        tempCtx: CanvasRenderingContext2D
    ) {
        super();
        this.canvas = canvas;
        this.ctx = ctx;
        this.tempCanvas = tempCanvas;
        this.tempCtx = tempCtx;
        this.bind();
        this.calCanvasPosition();
    }

    setBrushSize(size: number) {
        this.brushSize = size;
    }

    mode(type: DrawMode) {
        this.drawMode = type;
        this.endPath();
    }

    endPath() {
        this.clearTemp();
        if (this.trace.length > 1) this.drawPath(this.trace);
        this.emit('end', this.trace);
        this.trace = [];
        this.lastNode = void 0;
        this.mouseDown = false;
        this.touchDown = false;
    }

    bind() {
        const end = () => {
            this.endPath();
        };

        const onMouseDown = (ev: MouseEvent) => {
            if (this.mouseDown || this.touchDown) return;
            ev.preventDefault();
            this.mouseDown = true;
            this.touchDown = false;
            this.trace = [[ev.offsetX, ev.offsetY]];
            this.lastNode = [ev.offsetX, ev.offsetY];
            this.emit('start');
        };
        const onMouseMove = (ev: MouseEvent) => {
            if (!this.mouseDown || this.touchDown) return;
            ev.preventDefault();
            const x = ev.offsetX;
            const y = ev.offsetY;
            if (this.lastNode) this.linkTempPath(this.lastNode, [x, y]);
            this.trace.push([x, y]);
            this.lastNode = [x, y];
            this.emit('move');
        };
        const onTouchStart = (ev: TouchEvent) => {
            if (this.mouseDown || this.touchDown) return;
            this.touchId = ev.touches[0]?.identifier ?? void 0;
            if (this.touchId === void 0) return;
            ev.preventDefault();
            this.mouseDown = false;
            this.touchDown = true;
            const touch = ev.touches[0];
            const x = touch.clientX - this.posX;
            const y = touch.clientY - this.posY;
            this.trace = [[x, y]];
            this.emit('start');
        };
        const onTouchMove = (ev: TouchEvent) => {
            if (this.touchId === void 0) return;
            if (!this.touchDown || this.mouseDown) return;
            ev.preventDefault();
            const touch = Array.from(ev.touches).find(
                v => v.identifier === this.touchId
            );
            if (!touch) return;
            const x = touch.clientX - this.posX;
            const y = touch.clientY - this.posY;
            if (this.lastNode) this.linkTempPath(this.lastNode, [x, y]);
            this.trace.push([x, y]);
            this.lastNode = [x, y];
            this.emit('move');
        };
        const onTouchEnd = (ev: TouchEvent) => {
            if (
                Array.from(ev.touches).every(v => v.identifier !== this.touchId)
            ) {
                end();
            }
        };
        const onMouseLeave = () => {
            if (this.mouseDown) end();
        };

        this.canvas.addEventListener('mousedown', onMouseDown);
        this.canvas.addEventListener('mousemove', onMouseMove);
        this.canvas.addEventListener('mouseup', onMouseLeave);
        this.canvas.addEventListener('mouseleave', onMouseLeave);
        this.canvas.addEventListener('touchstart', onTouchStart);
        this.canvas.addEventListener('touchmove', onTouchMove);
        this.canvas.addEventListener('touchend', onTouchEnd);
        this.canvas.addEventListener('touchcancel', onTouchEnd);
        this.li = [
            { type: 'mousedown', fn: onMouseDown },
            { type: 'mousemove', fn: onMouseMove },
            { type: 'mouseup', fn: end },
            { type: 'mouseleave', fn: end },
            { type: 'touchstart', fn: onTouchStart },
            { type: 'touchmove', fn: onTouchMove },
            { type: 'touchend', fn: end },
            { type: 'touchcancel', fn: end }
        ];
    }

    calCanvasPosition() {
        let current: HTMLElement | null = this.canvas;
        let nx = 0;
        let ny = 0;

        while (current) {
            nx += current.offsetLeft;
            ny += current.offsetTop;
            current = current.offsetParent as HTMLElement | null;
        }

        this.posX = nx - window.scrollX;
        this.posY = ny - window.scrollY;
    }

    unbind() {
        this.li.forEach(v => {
            this.canvas.removeEventListener(v.type, v.fn);
        });
        this.li = [];
    }

    linkTempPath(node1: [number, number], node2: [number, number]) {
        if (this.drawMode === DrawMode.Draw) {
            const ctx = this.tempCtx;
            ctx.save();
            ctx.lineWidth = this.brushSize;
            ctx.strokeStyle = 'black';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.scale(devicePixelRatio, devicePixelRatio);
            ctx.beginPath();
            ctx.moveTo(node1[0], node1[1]);
            ctx.lineTo(node2[0], node2[1]);
            ctx.stroke();
            ctx.restore();
        } else {
            const ctx = this.ctx;
            ctx.save();
            ctx.lineWidth = this.brushSize;
            ctx.strokeStyle = 'black';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.scale(devicePixelRatio, devicePixelRatio);
            ctx.beginPath();
            ctx.moveTo(node1[0], node1[1]);
            ctx.lineTo(node2[0], node2[1]);
            ctx.stroke();
            ctx.restore();
        }
    }

    clearTemp() {
        this.tempCtx.clearRect(
            0,
            0,
            this.tempCanvas.width,
            this.tempCanvas.height
        );
    }

    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    drawPath(path: [number, number][], originSize?: number) {
        if (this.drawMode === DrawMode.Erase) return;
        const ctx = this.ctx;

        const scale = originSize ? this.canvas.width / originSize : 1;

        ctx.save();
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.brushSize;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(path[0][0] * scale, path[0][1] * scale);
        for (const [x, y] of path.slice(1)) {
            ctx.lineTo(x * scale, y * scale);
        }
        ctx.stroke();
        ctx.restore();
    }
}
