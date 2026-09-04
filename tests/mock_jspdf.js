class MockJsPDF {
  constructor() {
    this.internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };
  }
  saveGraphicsState() {}
  restoreGraphicsState() {}
  setTextColor() {}
  setFont() {}
  setFontSize() {}
  text() {}
  setDrawColor() {}
  setLineWidth() {}
  rect() {}
  line() {}
  splitTextToSize(txt) {
    return [txt];
  }
  setFillColor() {}
  roundedRect() {}
  addPage() {}
  output() {
    return new ArrayBuffer(1024);
  }
}

export default MockJsPDF;
