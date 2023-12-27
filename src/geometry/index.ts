export class Vec2 {
  x = 0;
  y = 0;
  static of(x = 0, y = 0) {
    const v = new Vec2();
    v.x = x;
    v.y = y;
    return v;
  }
  get length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  normalize() {
    const len = this.length;
    if (len === 0) {
      return Vec2.of(0, 0);
    }
    return Vec2.of(this.x / len, this.y / len);
  }
  multiply(v: number) {
    return Vec2.of(this.x * v, this.y * v);
  }
}
