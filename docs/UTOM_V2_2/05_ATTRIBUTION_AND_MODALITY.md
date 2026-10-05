# Attribution and modality

A gold manifest külön jelöli:

- official attribution: minisztérium, rendőrség, önkormányzat;
- anonymous attribution: névtelen forrás;
- quoted: idézett személy;
- journalist statement: az újságíró saját megfogalmazása;
- plan, completed, conditional, possible, unknown és correction modalitás.

Az attribution accuracy csak matched claim esetén értelmezhető. Az üres baseline ezért `N/A`; ez nem jelent jó eredményt.

Biztonsági termékszabály: attribution nélküli állítás nem jelenhet meg úgy, mintha az UTOM saját, bizonyított tényállítása lenne.

Az oracle validation az official, expert, quoted és journalist megkülönböztetést, a mutation suite a hibás attribúciót és a lost conditional esetet is felismeri.
