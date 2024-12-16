import json
import re

def json_onus_config(filtered_currentPort_path, onus_config_path):
    try:
        # Tentativa de leitura do arquivo
        with open(filtered_currentPort_path, 'r') as file:
            content = file.read()
        
        if not content:
            print(f"Erro: O arquivo {filtered_currentPort_path} está vazio ou não foi lido corretamente.")
            return

        # Normalizando o conteúdo removendo quebras de linha desnecessárias
        content = content.replace("\n", "").replace("  ", " ")

        # Expressão regular para capturar informações das ONUs
        onu_pattern = re.compile(
            r'ont add \d+ (?P<ont_id>\d+) sn-auth "(?P<sn_auth>[^"]+)" omci ont-lineprofile-id (?P<lineprofile_id>\d+) '
            r'ont-srvprofile-id (?P<srvprofile_id>\d+) desc "(?P<desc>[^"]+)"'
        )

        # Expressão regular para capturar informações dos service-ports
        service_port_pattern = re.compile(
            r'service-port (?P<service_port_id>\d+) vlan (?P<vlan>\d+) gpon \S+ ont (?P<ont_id>\d+) '
            r'gemport (?P<gemport>\d+) multi-service user-vlan (?P<user_vlan>\d+) tag-transform \S+'
        )

        # Expressão regular para capturar informações do native-vlan
        native_vlan_pattern = re.compile(
            r'ont port native-vlan \d+ (?P<ont_id>\d+) eth \d+ vlan (?P<vlan>\d+) priority \d+'
        )

        # Encontrando todas as ONUs
        onus = []
        for onu_match in onu_pattern.finditer(content):
            ont_id = onu_match.group("ont_id")
            onu_data = {
                "ont_id": ont_id,
                "sn_auth": onu_match.group("sn_auth"),
                "lineprofile_id": onu_match.group("lineprofile_id"),
                "srvprofile_id": onu_match.group("srvprofile_id"),
                "desc": onu_match.group("desc"),
                "native_vlans": [],
                "service_ports": []
            }

            # Associando native-vlan com ONUs
            for native_vlan_match in native_vlan_pattern.finditer(content):
                if native_vlan_match.group("ont_id") == ont_id:
                    native_vlan_data = {
                        "vlan": native_vlan_match.group("vlan")
                    }
                    onu_data["native_vlans"].append(native_vlan_data)

            # Associando service-ports com ONUs
            for service_port_match in service_port_pattern.finditer(content):
                if service_port_match.group("ont_id") == ont_id:
                    service_port_data = {
                        "service_port_id": service_port_match.group("service_port_id"),
                        "vlan": service_port_match.group("vlan"),
                        "gemport": service_port_match.group("gemport"),
                        "user_vlan": service_port_match.group("user_vlan")
                    }
                    onu_data["service_ports"].append(service_port_data)

            onus.append(onu_data)

        if not onus:
            print("Erro: Nenhuma ONU foi encontrada no conteúdo do arquivo.")
            print(content)  # Imprimindo o conteúdo processado para depuração
            return

        # Salvando as ONUs no arquivo JSON
        with open(onus_config_path, 'w') as json_file:
            json.dump(onus, json_file, indent=4)

        print(f"Dados das ONUs foram salvos em '{onus_config_path}'.")

    except Exception as e:
        print(f"Erro ao processar o arquivo: {e}")
