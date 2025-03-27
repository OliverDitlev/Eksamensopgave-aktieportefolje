for (i=0;i<2;i++){
console.log('tester om app virker')
console.log('hej')
console.log("test2")}
console.log("test3")




let a = [1,2];

function random(a) {
  let b = Math.floor(Math.random() * a.length)
  return b;
};

function hejfarvel() {
  random(a);

  if (b === 1) {
    console.log("hej")
  } else if (b === 2) {
    console.log("farvel")
  }
}

hejfarvel()