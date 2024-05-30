package pposonggil.usedStuff.dto.Color;

public enum SubwayColor {
    수도권_1호선("#0052A4"),
    수도권_1호선_급행("#0052A4"),
    수도권_1호선_특급("#0052A4"),
    수도권_2호선("#00A84D"),
    수도권_3호선("#EF7C1C"),
    수도권_4호선("#00A5DE"),
    수도권_4호선_급행("#00A5DE"),
    수도권_5호선("#996CAC"),
    수도권_6호선("#CD7C2F"),
    수도권_7호선("#747F00"),
    수도권_8호선("#E6186C"),
    수도권_9호선("#BDB092"),
    수도권_9호선_급행("#BDB092"),
    수도권_수인분당선("#F5A200"),
    수도권_수인분당선_급행("#F5A200"),
    수도권_신분당선("#D31145"),
    수도권_공항철도("#0090D2"),
    수도권_서해선("#8FC31F"),
    경의중앙선("#77C4A3"),
    경의중앙선_급행("#77C4A3"),
    수도권_에버라인("#56AD2D"),
    수도권_경춘선("#0C8E72"),
    경춘선_급행("#0C8E72"),
    수도권_의정부경전철("#FDA600"),
    수도권_경강선("#0054A6"),
    수도권_우이신설선("#B0CE18"),
    수도권_김포골드라인("#A17800"),
    수도권_신림선("#6789CA"),
    인천_1호선("#7CA8D5"),
    인천_2호선("#ED8B00"),
    대전_1호선("#007448"),
    대구_1호선("#D93F5C"),
    대구_2호선("#00AA80"),
    대구_3호선("#FFB100"),
    광주_1호선("#009088"),
    부산_1호선("#F06A00"),
    부산_2호선("#81BF48"),
    부산_3호선("#BB8C00"),
    부산_4호선("#217DCB"),
    부산_김해경전철("#8652A1");

    private final String colorCode;

    SubwayColor(String colorCode) {
        this.colorCode = colorCode;
    }

    public String getColorCode() {
        return colorCode;
    }
}