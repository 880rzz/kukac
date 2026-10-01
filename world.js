window.KUKAC_WORLD={
  build({THREE,world,deco,GRID,mat,rand}){
    while(world.children.length)world.remove(world.children[0]);
    while(deco.children.length)deco.remove(deco.children[0]);
    const floor=new THREE.Mesh(new THREE.BoxGeometry(GRID+1,0.6,GRID+1),mat(0x66c84b,0.78));
    floor.position.y=-0.35;floor.receiveShadow=true;world.add(floor);
    const tileMat=mat(0x79d65e,0.72),tileGeo=new THREE.BoxGeometry(0.92,0.08,0.92);
    for(let x=-9;x<=9;x++)for(let z=-9;z<=9;z++)if((x+z)%2===0){const t=new THREE.Mesh(tileGeo,tileMat);t.position.set(x,0.02,z);t.receiveShadow=true;world.add(t)}
    const wallMat=mat(0xd88b38,0.65);
    for(let i=-10;i<=10;i++)[[i,-10],[i,10],[-10,i],[10,i]].forEach(([x,z])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(0.92,0.78,0.92),wallMat);b.position.set(x,0.12,z);b.castShadow=true;b.receiveShadow=true;world.add(b)});
    const under=new THREE.Mesh(new THREE.BoxGeometry(GRID+5,1.8,GRID+5),mat(0x98612c,0.95));under.position.y=-1.55;world.add(under);
    for(let i=0;i<13;i++){const cloud=new THREE.Group();for(let p=0;p<3;p++){const c=new THREE.Mesh(new THREE.SphereGeometry(0.7+rand()*0.5,12,10),mat(0xffffff,0.95));c.position.set((p-1)*0.65,rand()*0.2,0);cloud.add(c)}const a=i/13*Math.PI*2,r=22+rand()*9;cloud.position.set(Math.cos(a)*r,7+rand()*6,Math.sin(a)*r);cloud.scale.setScalar(0.8+rand()*1.3);deco.add(cloud)}
    for(let i=0;i<14;i++){const hill=new THREE.Mesh(new THREE.ConeGeometry(3+rand()*3,5+rand()*5,7),mat(i%2?0x5fae39:0x438c31,0.9));const a=i/14*Math.PI*2,r=18+rand()*7;hill.position.set(Math.cos(a)*r,1,Math.sin(a)*r);hill.rotation.y=rand()*Math.PI;deco.add(hill)}
  }
};
