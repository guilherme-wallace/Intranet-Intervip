import json

def authorize_onus(ontSummary_path,onus_config_file, ontDelete_path, ontDeleteExcecao_path, autofind_onus_path, autorizaONU_path, autorizaONUExcecao_path, ont_pon_ANTIGA, start_id=0, lineprofile_id=None, srvprofile_id=None,
                   native_vlan=None, service_port_id=None, vlan=None, gemport=None, user_vlan=None):    
    try:
        # Leitura do arquivo JSON com as ONUs e do arquivo autofind
        with open(onus_config_file, 'r') as file:
            onus = json.load(file)
        
        with open(autofind_onus_path, 'r') as file:
            autofind_onus = json.load(file)
        
        with open(ontSummary_path, 'r') as file:
            ont_summary = json.load(file)
        
        # Obter lista de IDs de ONUs já em uso na PON nova
        used_ont_ids = {int(onu["ONT ID"]) for onu in ont_summary}

        # Listas para armazenar comandos de autorização
        authorization_commands = ["enable", "", "config", ""]
        exception_commands = ["enable", "", "config", ""]
        delete_commands = ["enable", "", "config"]
        delete_Excecao_commands = ["enable", "", "config"]

        # Iterar sobre as ONUs no arquivo de configuração
        for onu in onus:
            # Verificar se a ONU está no arquivo autofind
            matching_onu = next((a_onu for a_onu in autofind_onus if a_onu["Ont SN"] == onu["sn_auth"]), None)
            if not matching_onu:
                continue  # Pular a ONU se não estiver no autofind

            pon_antiga = ont_pon_ANTIGA
            interfaceGPON_antiga = "/".join(pon_antiga.split("/")[0:2])
            gPON_antiga = "/".join(pon_antiga.split("/")[2:3])

            # Definir PON nova baseada no arquivo autofind
            pon_nova = matching_onu["F/S/P"]
            interfaceGPON_nova = "/".join(pon_nova.split("/")[0:2])
            gPON_nova = "/".join(pon_nova.split("/")[2:3])

            # Encontrar o próximo ID de ONU disponível
            while start_id in used_ont_ids:
                start_id += 1
            ont_id = start_id
            start_id += 1
            used_ont_ids.add(ont_id)
            
            # Verificação das palavras-chave na descrição
            if "RDNT" in onu["desc"]:
                print(f"A ONU com ID: {onu['ont_id']} descrição: {onu['desc']} é rede neutra, então suas configuração não foram modificadas.")
                modified_lineprofile_id = onu["lineprofile_id"]
                modified_srvprofile_id = onu["srvprofile_id"]
                modified_native_vlan = onu["native_vlans"]
                modified_service_ports = onu["service_ports"]
                save_path = authorization_commands
                delete_path = delete_commands
            elif any(keyword in onu["desc"] for keyword in ["CORP", "ITX", "WIFI", "EVNT"]):
                print(f"A ONU com ID: {onu['ont_id']} será salva em {autorizaONUExcecao_path} devido à descrição: {onu['desc']}")
                modified_lineprofile_id = onu["lineprofile_id"]
                modified_srvprofile_id = onu["srvprofile_id"]
                modified_native_vlan = onu["native_vlans"]
                modified_service_ports = onu["service_ports"]
                save_path = exception_commands
                delete_path = delete_Excecao_commands
            else:
                modified_lineprofile_id = lineprofile_id or onu["lineprofile_id"]
                modified_srvprofile_id = srvprofile_id or onu["srvprofile_id"]
                modified_native_vlan = [{"vlan": native_vlan or vlan_info["vlan"]} for vlan_info in onu["native_vlans"]]
                modified_service_ports = [{
                    "service_port_id": service_port_id or sp_info["service_port_id"],
                    "vlan": vlan or sp_info["vlan"],
                    "gemport": gemport or sp_info["gemport"],
                    "user_vlan": user_vlan or sp_info["user_vlan"]
                } for sp_info in onu["service_ports"]]
                save_path = authorization_commands
                delete_path = delete_commands

            # Gerando comandos para autorizar a ONU
            commands = [
                f"interface gpon {interfaceGPON_nova}",
                f'ont add {gPON_nova} {ont_id} sn-auth "{onu["sn_auth"]}" omci ont-lineprofile-id {modified_lineprofile_id} ont-srvprofile-id {modified_srvprofile_id} desc "{onu["desc"]}"'
            ]
            
            # Adicionando comandos para native-vlans
            for vlan_info in modified_native_vlan:
                commands.append(f'ont port native-vlan {gPON_nova} {ont_id} eth 1 vlan {vlan_info["vlan"]} priority 0')

            commands.append("quit")

            # Adicionando comandos para service-ports
            for sp_info in modified_service_ports:
                commands.append(
                    f'\nservice-port vlan {sp_info["vlan"]} gpon {pon_nova} ont {ont_id} gemport {sp_info["gemport"]} multi-service user-vlan {sp_info["user_vlan"]} tag-transform translate'
                )

            # Adicionando comandos à lista correspondente (normal ou exceção)
            for command in commands:
                save_path.append(command)
                save_path.append("")  # Linha em branco após cada comando

            # Gerando comandos para deletar a ONU e adicionar ao arquivo ontDelete.txt ou ontDeleteExcecao.txt
            delete_path.extend([
                f"\nundo service-port {sp_info['service_port_id']}" for sp_info in modified_service_ports
            ])
            delete_path.append("")  # Linha em branco após cada comando
            delete_path.append(f"interface gpon {interfaceGPON_antiga}")
            delete_path.append("")  # Linha em branco após cada comando
            delete_path.append(f"ont delete {gPON_antiga} {onu['ont_id']}")
            delete_path.append("")  # Linha em branco após cada comando
            delete_path.append(f"quit")

        # Salvando os comandos no arquivo principal
        if authorization_commands:
            with open(autorizaONU_path, 'w') as output_file:
                output_file.write("\n".join(authorization_commands))
        
        # Salvando os comandos no arquivo de exceção
        if exception_commands:
            with open(autorizaONUExcecao_path, 'w') as exception_file:
                exception_file.write("\n".join(exception_commands))

        # Salvando os comandos no arquivo ontDelete.txt
        if delete_commands:
            with open(ontDelete_path, 'w') as delete_file:
                delete_file.write("\n".join(delete_commands))

        # Salvando os comandos no arquivo ontDeleteExcecao.txt
        if delete_Excecao_commands:
            with open(ontDeleteExcecao_path, 'w') as delete_Excecao_file:
                delete_Excecao_file.write("\n".join(delete_Excecao_commands))

        print(f"Comandos de autorização gerados e salvos em {autorizaONU_path} e {autorizaONUExcecao_path}. Comandos de remoção salvos em {ontDelete_path} e {ontDeleteExcecao_path}.")
    
    except Exception as e:
        print(f"Erro ao processar o arquivo JSON: {e}")

