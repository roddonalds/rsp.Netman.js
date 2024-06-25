window.rsp = {
    PRIMARY_COLOR: '#' + process.env.RSP_PRIMARY_COLOR,
    SECONDARY_COLOR: '#' + process.env.RSP_SECONDARY_COLOR,
    GRADIENT_DEG_COLOR: process.env.RSP_GRADIENT_DEG_COLOR
}

let primaryColor = window.rsp.PRIMARY_COLOR,
    secondaryColor = window.rsp.SECONDARY_COLOR,
    gradientColorDeg = window.rsp.GRADIENT_DEG_COLOR;

const primaryColorRgba = toRgba(primaryColor, 1)
const secondaryColorRgba = toRgba(secondaryColor, 0.7)
const backgroundColor = `linear-gradient(${gradientColorDeg}, ${primaryColorRgba} 0%, ${secondaryColorRgba} 100%)`;

console.log('primaryColor', primaryColor)
console.log('secondaryColor', secondaryColor)
console.log('backgroundColor', backgroundColor)

document.querySelector('#app > #app').style.background = backgroundColor;

