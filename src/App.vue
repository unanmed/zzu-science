<template>
    <div class="main">
        <div id="tool" class="tool">
            <RadioGroup class="radio radio-main" v-model:value="mode">
                <Radio class="radio" :value="DrawMode.Draw">画笔</Radio>
                <Radio class="radio" :value="DrawMode.Erase">橡皮</Radio>
            </RadioGroup>
            <div class="size-slider">
                <span>{{ mode === DrawMode.Draw ? '画笔' : '橡皮' }}大小</span>
                <Slider
                    class="slider"
                    :min="1"
                    :max="100"
                    v-model:value="size"
                ></Slider>
                <InputNumber
                    :min="1"
                    :max="100"
                    v-model:value="size"
                ></InputNumber>
            </div>
            <Button class="button" @click="clearCanvas">清除</Button>
            <Button class="button" @click="confirm" type="primary">确定</Button>
        </div>
        <div id="drawer" class="drawer">
            <canvas id="drawer-temp"></canvas>
            <canvas id="drawer-main"></canvas>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    Button,
    InputNumber,
    message,
    Modal,
    RadioGroup,
    Slider
} from 'ant-design-vue';
import { Radio } from 'ant-design-vue';
import { onMounted, ref, watch } from 'vue';
import { CanvasDrawer, DrawMode } from './canvas';
import axios from 'axios';

const mode = ref<DrawMode>(DrawMode.Draw);
const size = ref(5);
let drawer: CanvasDrawer;

let main: HTMLCanvasElement;
let temp: HTMLCanvasElement;
let div: HTMLDivElement;
let tool: HTMLDivElement;

let drawSize = 5;
let eraseSize = 30;

watch(mode, v => {
    if (v === DrawMode.Draw) {
        size.value = drawSize;
    } else {
        size.value = eraseSize;
    }
    drawer.mode(v);
});

watch(size, v => {
    if (mode.value === DrawMode.Draw) {
        drawSize = size.value;
    } else {
        eraseSize = size.value;
    }
    drawer.setBrushSize(v);
});

function resize() {
    const width = window.innerWidth - 100;
    const height = window.innerHeight - 200;
    const ratio = width / height;
    const expect = 16 / 9;
    const realWidth = ratio > expect ? height * expect : width;
    const realHeight = ratio < expect ? width / expect : height;

    main.width = realWidth * devicePixelRatio;
    main.height = realHeight * devicePixelRatio;
    temp.width = realWidth * devicePixelRatio;
    temp.height = realHeight * devicePixelRatio;

    main.style.width = `${realWidth}px`;
    main.style.height = `${realHeight}px`;
    temp.style.width = `${realWidth}px`;
    temp.style.height = `${realHeight}px`;
    div.style.width = `${realWidth}px`;
    div.style.height = `${realHeight}px`;
    tool.style.width = `${realWidth}px`;

    drawer.calCanvasPosition();
}

async function confirm() {
    const text = Modal.info({
        title: '上传',
        content: '请等待绘制内容上传完毕',
        okText: '确认',
        cancelText: '取消',
        closable: false
    });
    drawer.endPath();
    const main = drawer.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = main.width;
    canvas.height = main.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(main, 0, 0);
    const data = canvas.toDataURL('image/png');
    const form = new FormData();
    form.append('data', data);
    const error = await axios.post('/writeImage', data).catch(reason => reason);
    text.destroy();
    if (error instanceof Error) {
        message.error({
            content: '上传失败！请联系管理员！'
        });
        alert('上传失败！请联系管理员！错误信息：' + error);
        console.error(error);
    } else {
        message.success({
            content: '上传完成！'
        });
    }
}

async function clearCanvas() {
    const ensure = await new Promise<boolean>(res =>
        Modal.confirm({
            title: '确认',
            content: '确认要清空画布吗？',
            okText: '确认',
            cancelText: '取消',
            onOk() {
                res(true);
            },
            onCancel() {
                res(false);
            }
        })
    );
    if (ensure) {
        drawer.endPath();
        drawer.clearTemp();
        drawer.clear();
    }
}

onMounted(() => {
    main = document.getElementById('drawer-main') as HTMLCanvasElement;
    temp = document.getElementById('drawer-temp') as HTMLCanvasElement;
    div = document.getElementById('drawer') as HTMLDivElement;
    tool = document.getElementById('tool') as HTMLDivElement;
    const ctx = main.getContext('2d');
    const tempCtx = temp.getContext('2d');
    if (!ctx || !tempCtx) return;

    drawer = new CanvasDrawer(main, ctx, temp, tempCtx);
    resize();
});
</script>

<style lang="css" scoped>
.main {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.tool {
    display: flex;
    flex-direction: row;
    justify-content: end;
    align-items: center;
    height: 100px;
    width: 100%;
    font-size: 16px;
}

.radio-main {
    margin-right: 30px;
}

.radio {
    font-size: 16px;
}

.button {
    font-size: 16px;
    width: 80px;
    height: 36px;
    margin-left: 20px;
}

.drawer {
    border: 2px solid #333;
}

.size-slider {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.slider {
    width: 200px;
}

#drawer-main,
#drawer-temp {
    position: absolute;
}
</style>
