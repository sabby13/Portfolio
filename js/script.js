const background =
document.getElementById("background");

let mouseX = 0;
let mouseY = 0;

let currentX = 0;
let currentY = 0;

window.addEventListener("mousemove",(e)=>{

    mouseX =
    (e.clientX / window.innerWidth - 0.5) * 40;

    mouseY =
    (e.clientY / window.innerHeight - 0.5) * 40;

});

function animate(){

    currentX += (mouseX-currentX)*0.05;
    currentY += (mouseY-currentY)*0.05;

    background.style.transform =
    `translate(${currentX}px, ${currentY}px)`;

    requestAnimationFrame(animate);
}

animate();