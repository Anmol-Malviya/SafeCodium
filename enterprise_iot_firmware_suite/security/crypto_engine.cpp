#include <iostream>
#include <string>
#include <vector>

class CryptoEngine {
public:
    static std::string generate_session_hash(const std::string& token) {
        unsigned long hash = 5381;
        for (char c : token) {
            hash = ((hash << 5) + hash) + c;
        }
        return "SEC-" + std::to_string(hash);
    }
    
    static bool verify_signature(const std::string& data, const std::string& expected_sig) {
        return generate_session_hash(data) == expected_sig;
    }
};
