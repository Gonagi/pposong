package pposonggil.usedStuff.dto.Trade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pposonggil.usedStuff.domain.Trade;
import pposonggil.usedStuff.domain.TransactionAddress;
import pposonggil.usedStuff.dto.Information.InformationDto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import static lombok.AccessLevel.PRIVATE;
import static lombok.AccessLevel.PROTECTED;

@Data
@Builder
@NoArgsConstructor(access = PROTECTED)
@AllArgsConstructor(access = PRIVATE)
public class TradeInformationDto {
    private Long tradeId;
    private Long chatRoomId;
    private Long subjectId;
    private String subjectNickName;
    private Long objectId;
    private String objectNickName;
    private String startTimeString;
    private String endTimeString;
    private TransactionAddress address;
    private LocalDateTime createdAt;
    private LocalDateTime updateAt;
    private List<InformationDto> informationDtos;

    public static TradeInformationDto fromEntity(Trade trade) {
        return TradeInformationDto.builder()
                .tradeId(trade.getId())
                .chatRoomId(trade.getTradeChatRoom().getId())
                .subjectId(trade.getTradeSubject().getId())
                .subjectNickName(trade.getTradeSubject().getNickName())
                .objectId(trade.getTradeObject().getId())
                .objectNickName(trade.getTradeObject().getNickName())
                .startTimeString(trade.getStartTimeString())
                .endTimeString(trade.getEndTimeString())
                .address(trade.getAddress())
                .createdAt(trade.getCreatedAt())
                .updateAt(trade.getUpdateAt())
                .informationDtos(trade.getInformations().stream()
                        .map(InformationDto::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
}